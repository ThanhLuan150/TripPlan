import {announcements} from '../../support/fixtures';
import {mockApi, reply, signIn, t, visit} from '../../support/helpers';

describe('notifications', () => {
  beforeEach(() => {
    signIn();
  });

  it('lists the notifications the admin published, with their date', () => {
    mockApi({'GET /announcements': announcements});
    visit('/notification');

    cy.findByText('Chào mừng Aloca').should('be.visible');
    cy.findByText('Bắt đầu hành trình của bạn').should('be.visible');
    cy.findByText('Tính năng mới').should('be.visible');
    cy.contains(/2026/).should('be.visible');
  });

  it('marks them as read when the screen opens', () => {
    mockApi({'GET /announcements': announcements});
    visit('/notification');
    cy.findByText('Chào mừng Aloca').should('be.visible');

    cy.window()
      .its('localStorage')
      .should(storage => expect(JSON.parse(storage.getItem('seenNotifications') ?? '[]')).to.deep.eq(['a1', 'a2']));
  });

  it('says when there is none', () => {
    mockApi({'GET /announcements': []});
    visit('/notification');

    cy.findByText(t('profile.noNotifications')).should('be.visible');
  });

  it('says when they cannot be loaded', () => {
    mockApi({'GET /announcements': reply(500)});
    visit('/notification');

    cy.findByText(t('profile.notificationsFailed'), {timeout: 20_000}).should('be.visible');
  });
});
