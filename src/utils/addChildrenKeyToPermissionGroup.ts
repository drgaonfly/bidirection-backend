const addChildrenKeyToPermissionGroup = (array: string | any[]) => {
    for (let i = 0; i < array.length; i++) {
      if (array[i].permissions?.length > 0) {
        if (array[i].children === undefined || array[i].children?.length === 0) {
          array[i].children = array[i].permissions;
        }
      }
  
      if (array[i].children && array[i].children.length > 0) {
        addChildrenKeyToPermissionGroup(array[i].children);
      }
    }
    return array
  }