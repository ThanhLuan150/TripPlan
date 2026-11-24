import {resetExternal} from './api';

// every test starts with the stubs (AI, route, province) in their default state
beforeEach(() => {
  resetExternal();
});
