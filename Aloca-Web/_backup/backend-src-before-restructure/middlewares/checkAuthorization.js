const checkAuthorization = (requiredRole) => {
    const getUserRole = async (roleId) => {
        try {
            const roleUser = await Role.findById(roleId);
            return roleUser;
        }
        catch (err) {
            console.log(err);
            return res.status(500).send("Internal Server Error")
        }
    }

    return async (req, res, next) => {
        try {
            const user = req.userData;
            const userRoleId = user.role_id;

            const roleUser = await getUserRole(user.role_id);
            const roleName = roleUser.role;

            if (!user || userRoleId != roleUser.id || roleName != requiredRole) {
                return res.status(403).send("Permission denied");
            }
            next()
        }
        catch (err) {
            console.log(err);
            return res.status(500).send("Internal Server Error")
        }
    }
}
module.exports = { checkAuthorization };