import {external, get, post, del, prompts, saveTrip, signIn} from '../support/api';

const day = (title: string, name: string, extra: Record<string, unknown> = {}) => ({
  title,
  activities: [{name_location: name, challenge_summary: 'Mô tả', level_of_difficult: 30, province: 'Đà Nẵng'}],
  transportCost: 10,
  foodCost: 20,
  otherCost: 30,
  ...extra,
});

const detail = (token: string, tripId: string) => get(`/trip-plan/get-trip/${tripId}`, token).its('body.tripDatas');
const propose = (token: string, tripId: string, instruction = 'đổi lịch trình') =>
  post(`/trip-plan/${tripId}/ai-edit`, token, {instruction});

describe('AI itinerary editing', () => {
  it('previews a proposal without saving, then saves it only on Accept', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        const proposed = {days: [day('Ngày 1 mới', 'Bà Nà Hills'), day('Ngày 2 mới', 'Hội An')]};
        external({ai: {text: JSON.stringify(proposed)}});

        propose(token, tripId, 'Thêm Bà Nà và Hội An').then(res => {
          expect(res.status).to.eq(200);
          expect(res.body.proposal.days).to.have.length(2);
          prompts().then(sent => expect(sent[sent.length - 1]).to.contain('Thêm Bà Nà và Hội An'));

          // preview only: the stored itinerary is unchanged
          detail(token, tripId).then(trip => {
            expect(trip.dataTripDays[0].title).not.to.eq('Ngày 1 mới');
            expect(trip.dataTripDays[1].challenges).to.have.length(0);
          });

          post(`/trip-plan/${tripId}/ai-edit/apply`, token, {proposalId: res.body.proposal.id}).its('status').should('eq', 200);
          detail(token, tripId).then(trip => {
            expect(trip.dataTripDays.map((d: any) => d.title)).to.deep.eq(['Ngày 1 mới', 'Ngày 2 mới']);
            expect(trip.dataTripDays[0].challenges.map((c: any) => c.nameLocation)).to.deep.eq(['Bà Nà Hills']);
            expect(trip.dataTripDays[1].challenges.map((c: any) => c.nameLocation)).to.deep.eq(['Hội An']);
            expect(trip.transportCostTotal).to.eq(20);
            expect(trip.foodCostTotal).to.eq(40);
            expect(trip.otherCostTotal).to.eq(60);
          });

          // an accepted proposal cannot be applied twice
          post(`/trip-plan/${tripId}/ai-edit/apply`, token, {proposalId: res.body.proposal.id}).its('status').should('eq', 404);
        });
      });
    });
  });

  it('Accept saves what the server stored, never what the client sends', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        external({ai: {text: JSON.stringify({days: [day('Từ AI', 'Bà Nà Hills'), day('Ngày 2 AI', 'Hội An')]})}});
        propose(token, tripId).then(res => {
          post(`/trip-plan/${tripId}/ai-edit/apply`, token, {
            proposalId: res.body.proposal.id,
            days: [day('Do client tự gửi', 'Nơi khác'), day('Cũng do client', 'Nơi khác 2')],
          }).its('status').should('eq', 200);
          detail(token, tripId).its('dataTripDays.0.title').should('eq', 'Từ AI');
        });
      });
    });
  });

  it('Reject: the proposal is forgotten and the itinerary stays as it was', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        detail(token, tripId).then(before => {
          external({ai: {text: JSON.stringify({days: [day('X', 'Y'), day('Z', 'W')]})}});
          propose(token, tripId).then(res => {
            const id = res.body.proposal.id as string;
            del(`/trip-plan/${tripId}/ai-edit/${id}`, token).its('status').should('eq', 200);
            post(`/trip-plan/${tripId}/ai-edit/apply`, token, {proposalId: id}).its('status').should('eq', 404);
          });
          detail(token, tripId).should('deep.eq', before);
        });
      });
    });
  });

  it('never drops a completed place: it is put back in the preview and stays after Accept', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId, chaId}) => {
        post('/challenge/updateProgress', token, {chaId, imageUrl: '/files/abc'}).its('status').should('eq', 200);
        // the AI drops "Cầu Rồng", which is completed
        external({ai: {text: JSON.stringify({days: [day('Mới 1', 'Bà Nà Hills'), day('Mới 2', 'Hội An')]})}});

        propose(token, tripId).then(res => {
          const names = res.body.proposal.days[0].activities.map((a: any) => [a.name_location, a.kept ?? false]);
          expect(names).to.deep.eq([['Bà Nà Hills', false], ['Cầu Rồng', true]]);
          post(`/trip-plan/${tripId}/ai-edit/apply`, token, {proposalId: res.body.proposal.id}).its('status').should('eq', 200);
        });

        detail(token, tripId).then(trip => {
          const kept = trip.dataTripDays[0].challenges.find((c: any) => c.nameLocation === 'Cầu Rồng');
          expect(kept).to.include({_id: chaId, completed: true, imageUrl: '/files/abc'});
        });
      });
    });
  });

  it('keeps the itinerary when the AI fails or answers with something invalid or incomplete', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        detail(token, tripId).then(before => {
          external({ai: {error: 'boom'}});
          propose(token, tripId).its('status').should('be.gte', 500);

          external({ai: {text: 'sorry, no JSON here'}});
          propose(token, tripId).then(res => {
            expect(res.status).to.eq(502);
            expect(res.body.code).to.eq('AI_INVALID_RESPONSE');
          });

          // incomplete: a missing day, then a negative cost
          external({ai: {text: JSON.stringify({days: [day('Chỉ một ngày', 'A')]})}});
          propose(token, tripId).its('status').should('eq', 502);
          external({ai: {text: JSON.stringify({days: [day('a', 'A', {foodCost: -5}), day('b', 'B')]})}});
          propose(token, tripId).its('status').should('eq', 502);

          detail(token, tripId).should('deep.eq', before);
        });
      });
    });
  });

  it('refuses an empty request and an unknown proposal, saving nothing', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        detail(token, tripId).then(before => {
          post(`/trip-plan/${tripId}/ai-edit`, token, {instruction: '   '}).its('status').should('eq', 400);
          post(`/trip-plan/${tripId}/ai-edit/apply`, token, {proposalId: 'nope'}).its('status').should('eq', 404);
          post(`/trip-plan/${tripId}/ai-edit/apply`, token, {}).its('status').should('eq', 404);
          detail(token, tripId).should('deep.eq', before);
        });
      });
    });
  });

  it('is only for the owner of the trip, and a proposal cannot be used by anyone else', () => {
    signIn().then(owner => {
      signIn().then(other => {
        saveTrip(owner.token).then(({tripId}) => {
          external({ai: {text: JSON.stringify({days: [day('a', 'A'), day('b', 'B')]})}});
          propose(owner.token, tripId).then(res => {
            const id = res.body.proposal.id as string;
            post(`/trip-plan/${tripId}/ai-edit`, undefined, {instruction: 'x'}).its('status').should('eq', 401);
            propose(other.token, tripId).its('status').should('eq', 404);
            post(`/trip-plan/${tripId}/ai-edit/apply`, other.token, {proposalId: id}).its('status').should('eq', 404);
            del(`/trip-plan/${tripId}/ai-edit/${id}`, other.token).its('status').should('eq', 404);
            // still usable by the owner
            post(`/trip-plan/${tripId}/ai-edit/apply`, owner.token, {proposalId: id}).its('status').should('eq', 200);
          });
        });
      });
    });
  });

  it('refuses a proposal of another trip of the same user', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        saveTrip(token).then(({tripId: otherTrip}) => {
          external({ai: {text: JSON.stringify({days: [day('a', 'A'), day('b', 'B')]})}});
          propose(token, tripId).then(res => {
            post(`/trip-plan/${otherTrip}/ai-edit/apply`, token, {proposalId: res.body.proposal.id}).its('status').should('eq', 404);
          });
        });
      });
    });
  });
});
