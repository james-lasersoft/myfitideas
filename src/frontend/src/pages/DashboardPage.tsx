import { useNavigate } from "react-router-dom";

interface StoredUser {
  firstName: string;
  email: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("currentUser");
  const user: StoredUser | null = storedUser
    ? JSON.parse(storedUser)
    : null;

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>My Fit Ideas</h1>
          <p>Welcome, {user?.firstName ?? "User"}</p>
        </div>

        <button type="button" onClick={logout}>
          Log Out
        </button>
      </header>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h2>Body Measurements</h2>
          <p>Record and review body progress over time.</p>
          <button type="button" disabled>
            Coming Next
          </button>
        </article>

        <article className="dashboard-card">
          <h2>Hydration</h2>
          <p>Track daily water intake and hydration history.</p>
          <button type="button" disabled>
            Coming Next
          </button>
        </article>

        <article className="dashboard-card">
          <h2>Account</h2>
          <p>{user?.email ?? "Authenticated user"}</p>
        </article>
      </section>
    </main>
  );
}
