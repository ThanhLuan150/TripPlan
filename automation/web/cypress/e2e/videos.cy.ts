import {videos} from '../support/fixtures';
import {mockApi, signIn, t, visit} from '../support/helpers';

describe('videos', () => {
  beforeEach(() => {
    signIn();
  });

  it('lists every published video', () => {
    mockApi({'GET /videos': videos});
    visit('/videos');

    cy.findByRole('heading', {name: t('videos.title')}).should('be.visible');
    cy.findByRole('button', {name: t('videos.play', {title: 'Fansipan'})}).should('be.visible');
    cy.findByRole('button', {name: t('videos.play', {title: 'Hội An'})}).should('be.visible');
  });

  it('plays a YouTube video in a dialog, with a link to YouTube', () => {
    mockApi({'GET /videos': videos});
    visit('/videos');

    cy.findByRole('button', {name: t('videos.play', {title: 'Fansipan'})}).click();

    cy.findByRole('dialog', {name: 'Fansipan'}).within(() => {
      cy.findByTitle('Fansipan').should('have.attr', 'src').and('match', /\/embed\/aaaaaaaaaaa/);
      cy.findByRole('link', {name: t('common.watchOnYoutube')}).should('have.attr', 'href', 'https://youtu.be/aaaaaaaaaaa');
      cy.findByRole('button', {name: t('common.close')}).click();
    });
    cy.findByRole('dialog').should('not.exist');
  });

  it('plays a video file, and closes with Escape', () => {
    // a video with a file and no YouTube link
    mockApi({'GET /videos': [{id: 'v9', title: 'Hội An', location: '', youtubeLink: '', src: 'https://cdn.e2e/x.mp4', thumbnail: ''}]});
    visit('/videos');

    cy.findByRole('button', {name: t('videos.play', {title: 'Hội An'})}).click();

    cy.findByRole('dialog', {name: 'Hội An'}).find('video').should('have.attr', 'src', 'https://cdn.e2e/x.mp4');
    cy.get('body').type('{esc}');
    cy.findByRole('dialog').should('not.exist');
  });

  it('says when a video cannot be played', () => {
    mockApi({'GET /videos': [{id: 'v3', title: 'Trống', location: '', youtubeLink: '', src: '', thumbnail: ''}]});
    visit('/videos');

    cy.findByRole('button', {name: t('videos.play', {title: 'Trống'})}).click();

    cy.findByRole('dialog').findByText(t('videos.unavailable')).should('be.visible');
  });

  it('says when there is no video', () => {
    mockApi({'GET /videos': []});
    visit('/videos');

    cy.findByText(t('videos.empty')).should('be.visible');
  });
});
