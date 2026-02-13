"use client";

import { useState, useEffect } from "react";
import { rallyUsers } from "@/lib/rally-api";
import type { RallyUser } from "@/lib/rally-api";

function getTierColor(tier: string) {
  switch (tier) {
    case "Platinum": return "#A78BFA";
    case "Gold": return "#F59E0B";
    case "Silver": return "#94A3B8";
    case "Bronze": return "#D97706";
    default: return "#8B95A5";
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<RallyUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rallyUsers.list().then((res) => {
      if (res.ok && res.data?.users) {
        setUsers(res.data.users);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="rally-admin-page">
      <div className="rally-admin-section">
        <div className="rally-admin-section-header">
          <h3>All Users ({users.length})</h3>
        </div>

        {loading ? (
          <div className="rally-admin-loading">Loading users...</div>
        ) : (
          <div className="rally-admin-table-wrap">
            <table className="rally-admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>School</th>
                  <th>Tier</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="rally-admin-user-cell">
                        <span className="rally-admin-user-avatar">{user.name.substring(0, 2).toUpperCase()}</span>
                        <div>
                          <span className="rally-admin-user-name">{user.name}</span>
                          <span className="rally-admin-user-handle">{user.handle}</span>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td><span className={`rally-admin-role rally-admin-role--${user.role}`}>{user.role}</span></td>
                    <td>{user.favoriteSchool || "-"}</td>
                    <td>
                      <span className="rally-admin-tier" style={{ color: getTierColor(user.tier || "Bronze") }}>
                        {user.tier || "Bronze"}
                      </span>
                    </td>
                    <td>
                      <span className={`rally-admin-verified ${user.emailVerified ? 'yes' : 'no'}`}>
                        {user.emailVerified ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
