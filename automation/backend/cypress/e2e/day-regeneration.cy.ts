import {del, external, get, post, prompts, saveTrip, signIn} from '../support/api';

const newDay = (title: string, names: string[], extra: Record<string, unknown> = {}) => ({
  title,
  activities: names.map(name => ({name_location: name, challenge_summary: 'Mô tả', level_of_difficult: 30, province: 'Đà Nẵng'})),
  transportCost: 10,
  foodCost: 20,
  otherCost: 30,
  ...extra,
});

const detail = (token: string, tripId: string) => get(`/trip-plan/get-trip/${tripId}`, token).its('body.tripDatas');
const dayIds = (token: string, tripId: string) => detail(token, tripId).then(trip => trip.dataTripDays.map((d: any) => d._id as string));
const url = (tripId: string) => `/trip-plan/${tripId}/day-regeneration`;
const propose = (token: string, tripId: string, dayId: string, instruction?: string) => post(url(tripId), token, {dayId, instruction});

describe('AI regeneration of one day', () => {
  beforeEach(() => {
    external({reset: true});
  });

  it('previews the new day without saving, then replaces that day only on Accept', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        dayIds(token, tripId).then(([day1]) => {
          detail(token, tripId).then(before => {
            external({ai: {text: JSON.stringify(newDay('Ngày 1 mới', ['Bà Nà Hills', 'Hội An']))}});

            propose(token, tripId, day1, 'Thêm Bà Nà và Hội An').then(res => {
              expect(res.status).to.eq(200);
              expect(res.body.proposal.dayId).to.eq(day1);
              expect(res.body.proposal.day.activities.map((a: any) => a.name_location)).to.deep.eq(['Bà Nà Hills', 'Hội An']);
              expect(res.body.current.title).to.eq('Day 1');
              prompts().then(sent => expect(sent[sent.length - 1]).to.contain('Thêm Bà Nà và Hội An'));

              // preview only: nothing stored changed
              detail(token, tripId).should('deep.eq', before);

              post(`${url(tripId)}/apply`, token, {proposalId: res.body.proposal.id}).its('status').should('eq', 200);
            });

            detail(token, tripId).then(trip => {
              expect(trip.dataTripDays[0].title).to.eq('Ngày 1 mới');
              expect(trip.dataTripDays[0].challenges.map((c: any) => c.nameLocation)).to.deep.eq(['Bà Nà Hills', 'Hội An']);
              // the other day keeps its data
              expect(trip.dataTripDays[1]).to.deep.eq(before.dataTripDays[1]);
              // totals: the new day 1 (10/20/30) plus the untouched day 2 (0/100000/0)
              expect(trip.transportCostTotal).to.eq(10);
              expect(trip.foodCostTotal).to.eq(100020);
              expect(trip.otherCostTotal).to.eq(30);
            });
          });
        });
      });
    });
  });

  it('regenerating the second day leaves the first day exactly as it was', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        dayIds(token, tripId).then(([, day2]) => {
          detail(token, tripId).then(before => {
            external({ai: {text: JSON.stringify(newDay('Ngày 2 mới', ['Hội An']))}});
            propose(token, tripId, day2).then(res => {
              post(`${url(tripId)}/apply`, token, {proposalId: res.body.proposal.id}).its('status').should('eq', 200);
            });
            detail(token, tripId).then(trip => {
              expect(trip.dataTripDays[0]).to.deep.eq(before.dataTripDays[0]);
              expect(trip.dataTripDays[1].title).to.eq('Ngày 2 mới');
              expect(trip.dataTripDays[1].challenges.map((c: any) => c.nameLocation)).to.deep.eq(['Hội An']);
            });
          });
        });
      });
    });
  });

  it('Accept saves what the server stored, never what the client sends', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        dayIds(token, tripId).then(([day1, day2]) => {
          external({ai: {text: JSON.stringify(newDay('Từ AI', ['Bà Nà Hills']))}});
          propose(token, tripId, day1).then(res => {
            post(`${url(tripId)}/apply`, token, {
              proposalId: res.body.proposal.id,
              dayId: day2,
              day: newDay('Do client tự gửi', ['Nơi khác']),
            }).its('status').should('eq', 200);
            detail(token, tripId).then(trip => {
              expect(trip.dataTripDays[0].title).to.eq('Từ AI');
              expect(trip.dataTripDays[1].title).to.eq('Day 2');
            });
          });
        });
      });
    });
  });

  it('Reject: the proposal is forgotten and the itinerary stays as it was', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        dayIds(token, tripId).then(([day1]) => {
          detail(token, tripId).then(before => {
            external({ai: {text: JSON.stringify(newDay('X', ['Y']))}});
            propose(token, tripId, day1).then(res => {
              const id = res.body.proposal.id as string;
              del(`${url(tripId)}/${id}`, token).its('status').should('eq', 200);
              post(`${url(tripId)}/apply`, token, {proposalId: id}).its('status').should('eq', 404);
            });
            detail(token, tripId).should('deep.eq', before);
          });
        });
      });
    });
  });

  it('never drops a completed place: it is put back in the preview and stays after Accept', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId, chaId}) => {
        dayIds(token, tripId).then(([day1]) => {
          post('/challenge/updateProgress', token, {chaId, imageUrl: '/files/abc'}).its('status').should('eq', 200);
          external({ai: {text: JSON.stringify(newDay('Mới', ['Bà Nà Hills']))}});

          propose(token, tripId, day1).then(res => {
            const names = res.body.proposal.day.activities.map((a: any) => [a.name_location, a.kept ?? false]);
            expect(names).to.deep.eq([['Bà Nà Hills', false], ['Cầu Rồng', true]]);
            post(`${url(tripId)}/apply`, token, {proposalId: res.body.proposal.id}).its('status').should('eq', 200);
          });

          detail(token, tripId).then(trip => {
            const kept = trip.dataTripDays[0].challenges.find((c: any) => c.nameLocation === 'Cầu Rồng');
            expect(kept).to.include({_id: chaId, completed: true, imageUrl: '/files/abc'});
          });
        });
      });
    });
  });

  it('keeps the itinerary when the AI fails, answers with an empty day or something invalid', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        dayIds(token, tripId).then(([day1]) => {
          detail(token, tripId).then(before => {
            external({ai: {error: 'boom'}});
            propose(token, tripId, day1).its('status').should('be.gte', 500);

            external({ai: {text: 'sorry, no JSON here'}});
            propose(token, tripId, day1).then(res => {
              expect(res.status).to.eq(502);
              expect(res.body.code).to.eq('AI_INVALID_RESPONSE');
            });

            external({ai: {text: JSON.stringify(newDay('Trống', []))}});
            propose(token, tripId, day1).then(res => {
              expect(res.status).to.eq(502);
              expect(res.body.code).to.eq('AI_EMPTY_DAY');
            });

            external({ai: {text: JSON.stringify(newDay('a', ['A'], {foodCost: -5}))}});
            propose(token, tripId, day1).its('status').should('eq', 502);
            external({ai: {text: JSON.stringify(newDay('', ['A']))}});
            propose(token, tripId, day1).its('status').should('eq', 502);

            detail(token, tripId).should('deep.eq', before);
          });
        });
      });
    });
  });

  it('refuses an unknown day, a day of another trip, a too long request and an unknown proposal, saving nothing', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        saveTrip(token).then(({tripId: otherTrip}) => {
          dayIds(token, otherTrip).then(([foreignDay]) => {
            dayIds(token, tripId).then(([day1]) => {
              detail(token, tripId).then(before => {
                propose(token, tripId, '64b0000000000000000000ff').its('status').should('eq', 404);
                propose(token, tripId, foreignDay).its('status').should('eq', 404);
                propose(token, tripId, day1, 'x'.repeat(501)).its('status').should('eq', 400);
                post(`${url(tripId)}/apply`, token, {proposalId: 'nope'}).its('status').should('eq', 404);
                post(`${url(tripId)}/apply`, token, {}).its('status').should('eq', 404);
                detail(token, tripId).should('deep.eq', before);
              });
            });
          });
        });
      });
    });
  });

  it('is only for the owner of the trip, and a proposal cannot be used by anyone else', () => {
    signIn().then(owner => {
      signIn().then(other => {
        saveTrip(owner.token).then(({tripId}) => {
          dayIds(owner.token, tripId).then(([day1]) => {
            external({ai: {text: JSON.stringify(newDay('a', ['A']))}});
            propose(owner.token, tripId, day1).then(res => {
              const id = res.body.proposal.id as string;
              post(url(tripId), undefined, {dayId: day1}).its('status').should('eq', 401);
              propose(other.token, tripId, day1).its('status').should('eq', 404);
              post(`${url(tripId)}/apply`, other.token, {proposalId: id}).its('status').should('eq', 404);
              del(`${url(tripId)}/${id}`, other.token).its('status').should('eq', 404);
              // still usable by the owner
              post(`${url(tripId)}/apply`, owner.token, {proposalId: id}).its('status').should('eq', 200);
            });
          });
        });
      });
    });
  });

  it('refuses a proposal of another trip of the same user', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        saveTrip(token).then(({tripId: otherTrip}) => {
          dayIds(token, tripId).then(([day1]) => {
            external({ai: {text: JSON.stringify(newDay('a', ['A']))}});
            propose(token, tripId, day1).then(res => {
              post(`${url(otherTrip)}/apply`, token, {proposalId: res.body.proposal.id}).its('status').should('eq', 404);
            });
          });
        });
      });
    });
  });
});
