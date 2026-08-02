import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { id: "dashboard", icon: "dashboard", label: "ראשי", path: "/" },
  { id: "exercises", icon: "fitness_center", label: "תרגילים", path: "/exercises" },
  { id: "workout", icon: "play_circle", label: "אימון", path: "/workout" },
  { id: "nutrition", icon: "restaurant", label: "תזונה", path: "/nutrition" },
  { id: "analytics", icon: "analytics", label: "ניתוח", path: "/analytics" },
  { id: "profile", icon: "person", label: "פרופיל", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background hairline-t">
      <div className="flex items-center justify-between py-2.5 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-[5px] flex-1 transition-colors duration-300"
            >
              <span className={`w-1 h-1 rounded-full mb-[1px] ${isActive ? "bg-primary" : "bg-transparent"}`} />
              <span className={`material-icon text-[22px] ${tab.id === "workout" ? "text-[28px]" : ""} ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {tab.icon}
              </span>
              <span className={`text-[9.5px] ${isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground"}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
