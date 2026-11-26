import {callsTo, expectCall, mockApi, signIn, t, visit} from '../../support/helpers';

const SUCCESS = 'Send message successfully';
const chats = [
  {_id: 'c1', title: 'Đà Lạt 3 ngày', createdAt: '2026-03-01T10:00:00', updatedAt: '2026-03-02T10:00:00'},
  {_id: 'c2', title: '', createdAt: '2026-02-01T10:00:00'},
];
const answerOf = (text: string, id = 'c9') => ({message: SUCCESS, data: {ChatResponse: text, chatAi: {_id: id}}});

const box = () => cy.findByRole('textbox', {name: t('assistant.message')});
const ask = (text: string) => box().type(`${text}{enter}`);

describe('AI assistant chat', () => {
  beforeEach(() => {
    signIn();
  });

  it('says what the chat is for and links to the destination ideas', () => {
    mockApi({'GET /chat': {data: chats}});
    visit('/assistant/chat');

    cy.findByText(t('assistant.roleHint')).should('be.visible');
    cy.findByRole('button', {name: t('assistant.toRecommend')}).click();
    cy.location('pathname').should('eq', '/assistant/recommend');
  });

  it('greets the user and suggests questions; nothing can be sent yet', () => {
    mockApi({'GET /chat': {data: chats}});
    visit('/assistant/chat');

    cy.findByText(t('assistant.welcome1')).should('be.visible');
    cy.findByText(t('assistant.welcome2')).should('be.visible');
    cy.findByText(t('assistant.suggestion2')).should('be.visible');
    cy.findByRole('button', {name: t('assistant.send')}).should('be.disabled');
    cy.findByRole('button', {name: t('assistant.newChat')}).should('be.disabled');
  });

  it('sends a question with Enter and shows the answer', () => {
    const calls = mockApi({'GET /chat': {data: chats}, 'POST /chat': answerOf('Đà Lạt đẹp nhất vào tháng 12.')});
    visit('/assistant/chat');

    ask('Nên đi Đà Lạt tháng mấy?');

    cy.findByText('Đà Lạt đẹp nhất vào tháng 12.').should('be.visible');
    box().should('have.value', '');
    expectCall(calls, 'POST', '/chat').its('body').should('deep.equal', {message: 'Nên đi Đà Lạt tháng mấy?', idChat: null});
    // the first question is the title of the conversation, and the suggestions are gone
    cy.findByTitle('Nên đi Đà Lạt tháng mấy?').should('be.visible');
    cy.findByText(t('assistant.suggestion2')).should('not.exist');
  });

  it('the next question continues the same conversation', () => {
    const calls = mockApi({'GET /chat': {data: chats}, 'POST /chat': answerOf('Có, khá lạnh.')});
    visit('/assistant/chat');

    ask('Câu 1');
    cy.findByText('Có, khá lạnh.').should('be.visible');
    box().type('Có lạnh không?');
    cy.findByRole('button', {name: t('assistant.send')}).click();

    expectCall(calls, 'POST', '/chat', 2).its('body').should('deep.equal', {message: 'Có lạnh không?', idChat: 'c9'});
  });

  it('a suggestion sends itself', () => {
    const calls = mockApi({'GET /chat': {data: chats}, 'POST /chat': answerOf('Vũng Tàu, Cần Giờ...')});
    visit('/assistant/chat');

    cy.findByRole('button', {name: t('assistant.suggestion1')}).click();

    cy.findByText('Vũng Tàu, Cần Giờ...').should('be.visible');
    expectCall(calls, 'POST', '/chat').its('body').should('deep.include', {message: t('assistant.suggestion1')});
  });

  it('Shift+Enter adds a line instead of sending; a blank message is not sent', () => {
    const calls = mockApi({'GET /chat': {data: chats}});
    visit('/assistant/chat');

    box().type('dòng 1{shift}{enter}dòng 2');
    box().should('have.value', 'dòng 1\ndòng 2');

    box().clear().type('   {enter}');
    cy.wrap(calls).should(list => expect(callsTo(list, 'POST', '/chat')).to.have.length(0));
  });

  it('turns an AI answer into a pre-filled trip form', () => {
    mockApi({
      'GET /chat': {data: chats},
      'POST /chat': answerOf('Lịch trình Đà Lạt 3 ngày cho 2 người: Hồ Xuân Hương, Langbiang.'),
    });
    visit('/assistant/chat');
    ask('Đi Đà Lạt');

    cy.findByRole('button', {name: t('assistant.planFromSuggestion')}).click();

    cy.location('pathname').should('eq', '/assistant/trips/new');
    cy.get('#province').should('have.value', 'Lâm Đồng');
    cy.get('#quantity').should('have.value', '2');
    cy.findByText(t('trips.create.fromChat')).should('be.visible');
  });

  it('starts a new conversation', () => {
    mockApi({'GET /chat': {data: chats}, 'POST /chat': answerOf('A1')});
    visit('/assistant/chat');
    ask('Q1');
    cy.findByText('A1').should('be.visible');

    cy.findByRole('button', {name: t('assistant.newChat')}).click();

    cy.findByText('A1').should('not.exist');
    cy.findByText(t('assistant.welcome1')).should('be.visible');
  });

  it('opens a saved conversation from the history', () => {
    mockApi({
      'GET /chat': {data: chats},
      'GET /chat/c1': {
        messages: [
          {role: 'user', text: 'Ăn gì ở Hà Nội?', createdAt: '2026-03-01T10:00:00'},
          {role: 'model', text: 'Phở, bún chả...', createdAt: '2026-03-01T10:01:00'},
        ],
      },
    });
    visit('/assistant/chat');

    cy.findByRole('button', {name: t('assistant.historyTitle')}).click();
    cy.findByRole('button', {name: /Đà Lạt 3 ngày/}).click();

    cy.findByText('Phở, bún chả...').should('be.visible');
    cy.findByTitle('Ăn gì ở Hà Nội?').should('be.visible');
  });

  it('deletes a conversation from the history after confirmation', () => {
    let remaining = [...chats];
    const calls = mockApi({
      'GET /chat': () => ({data: remaining}),
      'DELETE /chat/c1': () => {
        remaining = remaining.filter(chat => chat._id !== 'c1');
        return {message: 'ok'};
      },
    });
    visit('/assistant/chat');

    cy.findByRole('button', {name: t('assistant.historyTitle')}).click();
    cy.findByRole('button', {name: /Đà Lạt 3 ngày/}).should('be.visible');
    cy.findAllByRole('button', {name: t('assistant.deleteChat')}).first().click();
    cy.findByRole('dialog').findByRole('button', {name: t('common.delete')}).click();

    cy.findByRole('button', {name: /Đà Lạt 3 ngày/}).should('not.exist');
    expectCall(calls, 'DELETE', '/chat/c1');
  });

  it('says when there is no conversation yet', () => {
    mockApi({'GET /chat': {data: []}});
    visit('/assistant/chat');

    cy.findByRole('button', {name: t('assistant.historyTitle')}).click();

    cy.findByText(t('assistant.noHistory')).should('be.visible');
  });

  it('the history panel closes with Escape', () => {
    mockApi({'GET /chat': {data: chats}});
    visit('/assistant/chat');
    cy.findByRole('button', {name: t('assistant.historyTitle')}).click();
    cy.findByRole('complementary').should('be.visible');

    cy.get('body').type('{esc}');

    cy.findByRole('complementary').should('not.exist');
  });
});

