import { api } from '../config/api';
import { executeRobotAction } from '../services/robotApi';

jest.mock('../config/api', () => ({
  api: {
    defaults: {},
    get: jest.fn(),
    post: jest.fn(),
  },
  normalizeServerUrl: jest.fn((url) => url),
}));

describe('robotApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe enviar body vacio al ejecutar acciones', () => {
    executeRobotAction('dance');

    expect(api.post).toHaveBeenCalledWith('/action/dance');
  });
});
