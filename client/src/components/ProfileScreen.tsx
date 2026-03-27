import { C } from "../theme/colors";
function ProfileScreen() {
  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px", color: C.text }}>Profile</h1>
        <p style={{ margin: 0, color: C.sub, fontSize: "14px" }}>
          Manage your account and preferences
        </p>
      </div>

      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: "16px",
          padding: "20px",
          background: C.card,
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "999px",
              background: C.green,
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "20px",
            }}
          >
            F
          </div>

          <div>
            <div
              style={{
                color: C.text,
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              Frank Opare
            </div>
            <div style={{ color: C.sub, fontSize: "14px" }}>
              Plutus Investor
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: "16px",
          background: C.card,
          overflow: "hidden",
          marginBottom: "20px",
        }}
      >
        <ProfileRow title="Account & Security" subtitle="PIN, account details, login settings" />
        <ProfileRow title="Notifications" subtitle="Price alerts and app notifications" />
        <ProfileRow title="Appearance" subtitle="Theme and display preferences" />
        <ProfileRow title="Help & Support" subtitle="FAQs, contact, and assistance" isLast />
      </div>

      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: "16px",
          padding: "20px",
          background: C.card,
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            color: C.text,
            fontSize: "16px",
            fontWeight: 600,
            marginBottom: "10px",
          }}
        >
          About Plutus
        </div>

        <div style={{ color: C.sub, fontSize: "14px", lineHeight: 1.5 }}>
          Plutus is a Ghana stock market app built to help investors track
          holdings, watchlists, portfolio value, and market activity in a
          clean and modern experience.
        </div>
      </div>

      <button
        style={{
          width: "100%",
          background: "transparent",
          color: C.red,
          border: `1px solid ${C.border}`,
          borderRadius: "14px",
          padding: "14px 16px",
          fontSize: "16px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Log Out
      </button>
    </div>
  );
}

type ProfileRowProps = {
  title: string;
  subtitle: string;
  isLast?: boolean;
};

function ProfileRow({ title, subtitle, isLast = false }: ProfileRowProps) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderBottom: isLast ? "none" : `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            color: C.text,
            fontSize: "15px",
            fontWeight: 600,
            marginBottom: "4px",
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: C.sub,
            fontSize: "13px",
          }}
        >
          {subtitle}
        </div>
      </div>

      <div style={{ color: C.sub, fontSize: "18px" }}>›</div>
    </div>
  );
}

export default ProfileScreen;