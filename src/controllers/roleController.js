const roleService = require("../services/roleService");

exports.createRole = async (req, res) => {
  try {
    const role = await roleService.createRole(req.body);
    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create role",
      data: null,
    });
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();
    res.status(200).json({
      success: true,
      message: "Roles retrieved successfully",
      data: roles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve roles",
      data: null,
    });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Role retrieved successfully",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve role",
      data: null,
    });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await roleService.updateRole(req.params.id, req.body);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update role",
      data: null,
    });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const deleted = await roleService.deleteRole(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete role",
      data: null,
    });
  }
};

exports.assignPermissionsToRole = async (req, res) => {
  const { role_id, permissions } = req.body;

  try {
    if (!role_id || !Array.isArray(permissions)) {
      return res
        .status(400)
        .json({ message: "role_id dan permissions (array) wajib dikirim" });
    }

    const role = await roleService.getRoleById(role_id);

    if (!role) {
      return res.status(404).json({ message: "Role tidak ditemukan" });
    }

    await role.setPermissions([]); // ini akan clear pivot table

    if (permissions.length > 0) {
      const perms = await permissionService.getPermissionsByIds(permissions);

      await role.addPermissions(perms);
    }

    const updatedRole = await roleService.getRoleById(role_id);

    res.json({
      message: "Permission berhasil di-assign ulang.",
      data: updatedRole,
    });
  } catch (error) {
    console.error("Error assign permissions:", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan server.", error: error.message });
  }
};
