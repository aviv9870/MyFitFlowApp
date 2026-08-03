import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

const AppSidebar = ({ open, onClose, onNavigate }: Props) => {
  const { user, signOut } = useAuth();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-72 bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-border">
          <h2 className="text-base font-bold neon-text">תפריט</h2>
          <button onClick={onClose} className="p-1">
            <MaterialIcon icon="close" className="text-foreground text-[24px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Admin: manage trainees — only for the system admin account */}
          {user?.email?.toLowerCase() === "aviv9870@gmail.com" && (
            <button
              onClick={() => { onNavigate("coach"); onClose(); }}
              className="w-full glass-card p-3 flex items-center gap-3 hover:bg-card/70 transition-all"
            >
              <MaterialIcon icon="groups" className="text-primary text-[22px]" />
              <div className="text-right">
                <span className="text-sm font-bold text-foreground block">ניהול מתאמנים</span>
                <span className="text-[10px] text-muted-foreground">צור חשבונות, תוכניות וצפה בהתקדמות</span>
              </div>
            </button>
          )}

          {/* Other nav items */}
          <button
            onClick={() => { onNavigate("settings"); onClose(); }}
            className="w-full glass-card p-3 flex items-center gap-3 hover:bg-card/70 transition-all"
          >
            <MaterialIcon icon="settings" className="text-muted-foreground text-[22px]" />
            <span className="text-sm font-bold text-foreground">הגדרות</span>
          </button>

          <button
            onClick={() => { onNavigate("measurements"); onClose(); }}
            className="w-full glass-card p-3 flex items-center gap-3 hover:bg-card/70 transition-all"
          >
            <MaterialIcon icon="straighten" className="text-muted-foreground text-[22px]" />
            <span className="text-sm font-bold text-foreground">מדידות</span>
          </button>

        </div>

        <div className="px-4 py-4 border-t border-border">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 text-destructive text-sm py-2 hover:bg-destructive/10 rounded-lg transition-all"
          >
            <MaterialIcon icon="logout" className="text-[18px]" />
            התנתק
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;
