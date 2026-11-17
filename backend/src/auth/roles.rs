use crate::auth::jwt::Claims;

/// Who counts as Genius staff: the allow-list behind every staff-only route and
/// every staff-only company field (exhibitor password, internal remark, CRM
/// status, timestamps).
///
/// Deliberately an allow-list. Writing `role != "Company"` would open staff data
/// to every role added later, or to a token whose role string does not match
/// exactly.
///
/// NB: every account of the `members` sheet is full staff — `Role::from_str`
/// maps any role other than "admin" to `Member`.
pub fn is_genius_staff(claims: &Claims) -> bool {
    matches!(claims.role.as_str(), "Admin" | "Member")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn claims(role: &str) -> Claims {
        Claims {
            sub: "member-1".to_string(),
            email: "a@b.c".to_string(),
            role: role.to_string(),
            exp: 0,
        }
    }

    #[test]
    fn admins_and_members_are_staff() {
        assert!(is_genius_staff(&claims("Admin")));
        assert!(is_genius_staff(&claims("Member")));
    }

    #[test]
    fn company_tokens_are_never_staff() {
        assert!(!is_genius_staff(&claims("Company")));
    }

    /// The gate is an allow-list: an unknown or future role must default to
    /// outside, not inside.
    #[test]
    fn unknown_roles_default_to_outside() {
        for role in ["", "company", "admin", "Partner", "Superadmin"] {
            assert!(!is_genius_staff(&claims(role)), "role {role:?} counted as staff");
        }
    }
}
