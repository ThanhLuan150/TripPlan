import {mockUsers} from '@/__tests__/fixtures/admin/data';
import {bodyRows, openAdmin} from '../../support/admin';
import {callsTo, expectCall, expectNoCall, RED_BORDER, reply, stubDownloads, t} from '../../support/helpers';

// by position in the (newest first) list: 0 and 9 are admins, 4 is suspended, 8 is deleted
const [admin, , second, third, suspended, , , , deleted] = mockUsers;
const first = mockUsers[0];

const menuOf = (name: string) => cy.findByRole('button', {name: t('admin.users.moreActions', {name})}).click();
const select = (name: string) => cy.findByRole('checkbox', {name: t('admin.users.selectUser', {name})});
const menuItem = (key: string) => cy.findByRole('menuitem', {name: t(key)});

describe('admin: users list', () => {
  it('shows the first page, newest first, with the counts', () => {
    openAdmin('/admin/users');

    cy.findAllByText(first.fullname).first().should('be.visible');
    bodyRows().should('have.length', 10);
    cy.findByText(t('admin.pagination.summary', {from: 1, to: 10, total: mockUsers.length})).should('be.visible');
    bodyRows().first().should('contain.text', first.email);
    cy.findByText(t('admin.users.stats.total')).should('be.visible');
  });

  it('searches without caring about accents, and the box can be cleared', () => {
    openAdmin('/admin/users');
    bodyRows().should('have.length', 10);

    cy.findByRole('searchbox', {name: t('admin.users.search')}).type('nguyen van an');
    bodyRows().should('have.length', 1).first().should('contain.text', 'Nguyễn Văn An');

    cy.findByRole('button', {name: t('admin.common.clearSearch')}).click();
    bodyRows().should('have.length', 10);
  });

  it('says so when nothing matches, and "Reset filters" brings everything back', () => {
    openAdmin('/admin/users');
    bodyRows().should('have.length', 10);

    cy.findByRole('searchbox', {name: t('admin.users.search')}).type('zzzz');
    cy.findByText(t('admin.common.noResults')).should('be.visible');
    cy.findAllByRole('button', {name: t('admin.common.resetFilters')}).last().click();

    bodyRows().should('have.length', 10);
    cy.findByRole('searchbox', {name: t('admin.users.search')}).should('have.value', '');
  });

  it('filters by role and by status', () => {
    openAdmin('/admin/users');
    bodyRows().should('have.length', 10);

    cy.findByLabelText(t('admin.users.columns.role')).select('admin');
    bodyRows().should('have.length', 2);

    cy.findByLabelText(t('admin.users.columns.role')).select('all');
    cy.findByLabelText(t('admin.users.columns.status')).select('suspended');
    bodyRows().should('have.length', mockUsers.filter(u => u.status === 'suspended').length);
  });

  it('sorts and pages through the users', () => {
    openAdmin('/admin/users');
    bodyRows().should('have.length', 10);

    cy.findByRole('button', {name: t('admin.pagination.next')}).click();
    cy.findByText(t('admin.pagination.summary', {from: 11, to: 20, total: mockUsers.length})).should('be.visible');
    bodyRows().first().should('contain.text', mockUsers[10].fullname);

    cy.findByLabelText(t('admin.users.pageSize')).select('20');
    bodyRows().should('have.length', 20);
  });

  it('opens the profile from the name', () => {
    openAdmin('/admin/users', {
      [`GET /admin/users/${mockUsers[1].id}`]: {user: mockUsers[1], aiConversations: 0, trips: [], challenges: [], activity: []},
    });

    cy.findByRole('link', {name: mockUsers[1].fullname}).click();

    cy.location('pathname').should('eq', `/admin/users/${mockUsers[1].id}`);
  });

  it('exports the list as a CSV file', () => {
    openAdmin('/admin/users');
    bodyRows().should('have.length', 10);
    const downloads = stubDownloads();

    cy.findByRole('button', {name: t('admin.users.exportUsers')}).click();

    cy.wrap(downloads).should(names => expect(names[0]).to.match(/\.csv$/));
    cy.findByText(t('admin.users.toasts.exported', {count: mockUsers.length})).should('be.visible');
  });

  it('offers a retry when the users cannot be loaded', () => {
    let attempts = 0;
    openAdmin('/admin/users', {
      'GET /admin/users': () => {
        attempts += 1;
        // the app retries a failing request 3 times before showing the error
        return attempts <= 4 ? reply(500) : mockUsers;
      },
    });

    cy.findByRole('button', {name: t('admin.common.refresh')}).click();

    cy.findAllByText(first.fullname).first().should('be.visible');
  });
});

describe('admin: selecting users', () => {
  it('selects users, shows the bulk bar and clears the selection', () => {
    openAdmin('/admin/users');
    bodyRows().should('have.length', 10);
    cy.findByRole('region', {name: t('admin.users.bulk.label')}).should('not.exist');

    select(second.fullname).check();
    cy.findByText(t('admin.users.bulk.selected', {count: 1})).should('be.visible');
    select(third.fullname).check();
    cy.findByText(t('admin.users.bulk.selected', {count: 2})).should('be.visible');

    cy.findByRole('button', {name: t('admin.users.bulk.clear')}).click();
    cy.findByRole('region', {name: t('admin.users.bulk.label')}).should('not.exist');
  });

  it('selects the page, but never a deleted account', () => {
    openAdmin('/admin/users');
    bodyRows().should('have.length', 10);

    select(deleted.fullname).should('be.disabled');
    cy.findByRole('checkbox', {name: t('admin.users.selectPage')}).check();

    cy.findByText(t('admin.users.bulk.selected', {count: 9})).should('be.visible');
  });

  it('suspends the selection after asking for a reason', () => {
    const calls = openAdmin('/admin/users', {
      'POST /admin/users/bulk-status': {updated: [second.id, third.id], skipped: []},
    });
    select(second.fullname).check();
    select(third.fullname).check();
    cy.findAllByRole('button', {name: t('admin.users.bulk.suspend')}).first().click();

    const dialog = () => cy.findByRole('alertdialog', {name: t('admin.users.dialogs.suspendMany', {count: 2})});
    dialog().findByRole('button', {name: t('admin.users.dialogs.confirmSuspension')}).click();
    dialog().findByText(t('admin.users.errors.reasonRequired')).should('be.visible');
    dialog().findByLabelText(t('admin.users.dialogs.reason')).should('have.css', 'border-top-color', RED_BORDER);
    expectNoCall(calls, 'POST', '/admin/users/bulk-status');

    dialog().findByLabelText(t('admin.users.dialogs.reason')).type('Spam');
    dialog().findByRole('button', {name: t('admin.users.dialogs.confirmSuspension')}).click();

    cy.findByText(t('admin.users.toasts.suspended', {count: 2})).should('be.visible');
    expectCall(calls, 'POST', '/admin/users/bulk-status')
      .its('body')
      .should('deep.equal', {ids: [second.id, third.id], status: 'suspended', suspendReason: 'Spam'});
  });

  it('exports only the selection', () => {
    openAdmin('/admin/users');
    select(second.fullname).check();
    const downloads = stubDownloads();

    cy.findByRole('button', {name: t('admin.users.bulk.export')}).click();

    cy.wrap(downloads).should(names => expect(names[0]).to.match(/\.csv$/));
    cy.findByText(t('admin.users.toasts.exported', {count: 1})).should('be.visible');
  });
});

describe('admin: one account', () => {
  it('cannot select, edit or delete the signed-in admin', () => {
    openAdmin('/admin/users');
    // the signed-in user of the tests has the username of the first admin
    cy.window().then(win => {
      const session = JSON.parse(win.localStorage.getItem('user') ?? '{}');
      session.data.username = admin.username;
      win.localStorage.setItem('user', JSON.stringify(session));
    });
    cy.reload();
    bodyRows().should('have.length', 10);

    select(admin.fullname).should('be.disabled');
    menuOf(admin.fullname);
    menuItem('admin.users.editUser').should('be.disabled');
    menuItem('admin.users.deleteAccount').should('be.disabled');
  });

  it('suspends one account with a reason', () => {
    const calls = openAdmin('/admin/users', {[`PATCH /admin/users/${second.id}`]: {...second, status: 'suspended'}});

    menuOf(second.fullname);
    menuItem('admin.users.suspendAccount').click();
    cy.findByRole('alertdialog', {name: t('admin.users.suspendAccount')}).within(() => {
      cy.findByLabelText(t('admin.users.dialogs.reason')).type('  Vi phạm  ');
      cy.findByRole('button', {name: t('admin.users.dialogs.confirmSuspension')}).click();
    });

    cy.findByRole('alertdialog').should('not.exist');
    expectCall(calls, 'PATCH', `/admin/users/${second.id}`).its('body').should('deep.equal', {status: 'suspended', suspendReason: 'Vi phạm'});
  });

  it('reactivates a suspended account', () => {
    const calls = openAdmin('/admin/users', {[`PATCH /admin/users/${suspended.id}`]: {...suspended, status: 'active'}});

    menuOf(suspended.fullname);
    menuItem('admin.users.reactivateAccount').click();
    cy.findByRole('alertdialog').should('contain.text', suspended.email);
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.users.dialogs.confirmReactivation')}).click();

    cy.findByText(t('admin.users.toasts.reactivated', {count: 1})).should('be.visible');
    expectCall(calls, 'PATCH', `/admin/users/${suspended.id}`).its('body').should('deep.equal', {status: 'active'});
  });

  it('deletes an account after the warning, and keeps the dialog open on an error', () => {
    let attempts = 0;
    const calls = openAdmin('/admin/users', {
      [`PATCH /admin/users/${second.id}`]: () => {
        attempts += 1;
        return attempts === 1 ? reply(409, {message: 'Change the role first'}) : {...second, status: 'delete'};
      },
    });

    menuOf(second.fullname);
    menuItem('admin.users.deleteAccount').click();
    cy.findByRole('alertdialog').should('contain.text', t('admin.users.dialogs.deleteWarning'));

    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.users.deleteAccount')}).click();
    cy.findByRole('alertdialog').findByRole('alert').should('contain.text', 'Change the role first');

    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.users.deleteAccount')}).click();
    cy.findByRole('alertdialog').should('not.exist');
    cy.wrap(calls).should(list => expect(callsTo(list, 'PATCH', `/admin/users/${second.id}`)).to.have.length(2));
  });

  it('a dialog closes with Cancel and with Escape', () => {
    const calls = openAdmin('/admin/users');

    menuOf(second.fullname);
    menuItem('admin.users.deleteAccount').click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('common.cancel')}).click();
    cy.findByRole('alertdialog').should('not.exist');

    menuOf(second.fullname);
    menuItem('admin.users.deleteAccount').click();
    cy.get('body').type('{esc}');
    cy.findByRole('alertdialog').should('not.exist');
    expectNoCall(calls, 'PATCH');
  });

  it('validates the edit form and sends only what changed', () => {
    const calls = openAdmin('/admin/users', {[`PATCH /admin/users/${second.id}`]: {...second, fullname: 'Tên mới'}});
    menuOf(second.fullname);
    menuItem('admin.users.editUser').click();
    const dialog = () => cy.findByRole('dialog', {name: t('admin.users.editUser')});
    const name = () => dialog().findByLabelText(t('admin.users.fields.fullname'));
    const email = () => dialog().findByLabelText(t('admin.users.fields.email'));
    const save = () => dialog().findByRole('button', {name: t('admin.users.dialogs.saveChanges')});

    name().clear();
    email().clear().type('not-an-email');
    save().click();

    dialog().findByText(t('admin.users.errors.fullnameRequired')).should('be.visible');
    dialog().findByText(t('admin.users.errors.emailInvalid')).should('be.visible');
    name().should('have.attr', 'aria-invalid', 'true');
    expectNoCall(calls, 'PATCH');

    name().type('Tên mới');
    email().clear().type(second.email);
    save().click();

    cy.findByText(t('admin.users.toasts.updated')).should('be.visible');
    expectCall(calls, 'PATCH', `/admin/users/${second.id}`).its('body').should('deep.equal', {fullname: 'Tên mới'});
  });

  it('changes the role', () => {
    const calls = openAdmin('/admin/users', {[`PATCH /admin/users/${second.id}`]: {...second, role: 'admin'}});

    menuOf(second.fullname);
    menuItem('admin.users.changeRole').click();
    cy.findByRole('dialog', {name: t('admin.users.changeRole')})
      .should('contain.text', t('admin.users.dialogs.roleImpact.admin'))
      .findByRole('button', {name: t('admin.users.dialogs.confirmRole')})
      .click();

    cy.findByText(t('admin.users.toasts.roleChanged')).should('be.visible');
    expectCall(calls, 'PATCH', `/admin/users/${second.id}`).its('body').should('deep.equal', {role: 'admin'});
  });
});

describe('admin: add user', () => {
  const openDialog = (overrides: Record<string, unknown> = {}) => {
    const calls = openAdmin('/admin/users', overrides);
    cy.findByRole('button', {name: t('admin.users.add')}).click();
    return calls;
  };
  const dialog = () => cy.findByRole('dialog');
  const field = (key: string) => dialog().findByLabelText(t(`admin.users.fields.${key}`));
  const create = () => dialog().findByRole('button', {name: t('admin.users.dialogs.createAccount')});

  it('passing through an empty field shows no error; Submit shows them all', () => {
    openDialog();

    // the first field is focused when the dialog opens: clicking the next ones leaves it empty
    field('email').click();
    field('phone').click();
    dialog().findByText(t('admin.users.errors.fullnameRequired')).should('not.exist');

    create().click();

    dialog().findByText(t('admin.users.errors.fullnameRequired')).should('be.visible');
    dialog().findByText(t('admin.users.errors.emailRequired')).should('be.visible');
    dialog().findByText(t('admin.users.errors.passwordShort')).should('be.visible');
    field('fullname').should('have.css', 'border-top-color', RED_BORDER);
  });

  it('the phone number is optional, but checked when typed', () => {
    openDialog();

    field('phone').type('abc');
    field('password').focus();
    dialog().findByText(t('admin.users.errors.phoneInvalid')).should('be.visible');

    field('phone').clear().type('0901 234 567');
    dialog().findByText(t('admin.users.errors.phoneInvalid')).should('not.exist');
  });

  it('creates the account and opens its profile', () => {
    const created = {...mockUsers[1], id: 'new1', username: 'nguoimoi', fullname: 'Người Mới', email: 'moi@example.com'};
    const calls = openDialog({
      'POST /admin/users': created,
      'GET /admin/users/new1': {user: created, aiConversations: 0, trips: [], challenges: [], activity: []},
    });

    field('fullname').type('Người Mới');
    field('username').type('nguoimoi');
    field('email').type('moi@example.com');
    field('password').type('matkhau123');
    create().click();

    cy.location('pathname').should('eq', '/admin/users/new1');
    expectCall(calls, 'POST', '/admin/users').its('body').should('deep.equal', {
      fullname: 'Người Mới',
      username: 'nguoimoi',
      email: 'moi@example.com',
      phone: '',
      role: 'user',
      password: 'matkhau123',
    });
  });

  it('shows a taken username next to its field', () => {
    openDialog({'POST /admin/users': reply(409, {message: 'Username already in use', field: 'username'})});

    field('fullname').type('Người Mới');
    field('username').type('nguoimoi');
    field('email').type('moi@example.com');
    field('password').type('matkhau123');
    create().click();

    dialog().findByText(t('admin.users.errors.usernameTaken')).should('be.visible');
  });
});
