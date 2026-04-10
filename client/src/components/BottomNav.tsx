import { C } from "../theme/colors";
import useIsCompactLayout from "../hooks/useIsCompactLayout";

type BottomNavProps = {
  activeTab: "home" | "market" | "profile";
  onChangeTab: (tab: "home" | "market" | "profile") => void;
};

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? C.green : C.sub}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function MarketIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? C.green : C.sub}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-8" />
      <path d="M22 20v-5" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? C.green : C.sub}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}

function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  const isCompactLayout = useIsCompactLayout();
  const items = [
    {
      key: "home" as const,
      label: "Home",
      icon: (active: boolean) => <HomeIcon active={active} />,
    },
    {
      key: "market" as const,
      label: "Market",
      icon: (active: boolean) => <MarketIcon active={active} />,
    },
    {
      key: "profile" as const,
      label: "Profile",
      icon: (active: boolean) => <ProfileIcon active={active} />,
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        background: "transparent",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          background: C.navBg,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-around",
          padding: isCompactLayout
            ? "10px 0 calc(10px + env(safe-area-inset-bottom, 0px))"
            : "10px 0 14px",
        }}
      >
        {items.map((item) => {
          const active = activeTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onChangeTab(item.key)}
              style={{
                background: "none",
                border: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                color: active ? C.green : C.sub,
                fontSize: isCompactLayout ? 11 : 12,
                fontWeight: active ? 600 : 400,
              }}
            >
              {item.icon(active)}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BottomNav;
