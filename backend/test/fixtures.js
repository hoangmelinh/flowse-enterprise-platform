// Dữ liệu test dùng chung: 2 công ty (workspace), mỗi nơi có admin, manager, member.
export const SCHEMA = 'flowse_test';
export const PASSWORD = 'Test@1234';

export const U = {
  adminA: { id: 1, username: 'admin_a', name: 'Admin A', email: 'admin.a@test.vn' },
  managerA: { id: 2, username: 'manager_a', name: 'Manager A', email: 'manager.a@test.vn' },
  memberA: { id: 3, username: 'member_a', name: 'Member A', email: 'member.a@test.vn' },
  adminB: { id: 4, username: 'admin_b', name: 'Admin B', email: 'admin.b@test.vn' },
  managerB: { id: 5, username: 'manager_b', name: 'Manager B', email: 'manager.b@test.vn' },
};

export const WS = {
  A: { id: 1, name: 'Công ty A', slug: 'cong-ty-a', owner: 1, members: [[1, 'admin'], [2, 'manager'], [3, 'member']] },
  B: { id: 2, name: 'Công ty B', slug: 'cong-ty-b', owner: 4, members: [[4, 'admin'], [5, 'manager']] },
};
