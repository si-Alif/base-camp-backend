const UserRoleEnums = {
    ADMIN :'admin',
    PROJECT_ADMIN : 'projectAdmin',
    MEMBER :'member'
};

const availableUserRole = Object.values(UserRoleEnums); // returns an array consisting of all the values stored in the target object

const taskStatusEnums = {
  TODO : "todo",
  IN_PROGRESS : 'in_progress',
  COMPLETED : 'completed'
};

const availableTaskStatus = Object.values(taskStatusEnums);

export {
  UserRoleEnums ,
  availableUserRole,
  taskStatusEnums,
  availableTaskStatus,
};

