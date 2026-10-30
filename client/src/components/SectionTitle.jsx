
import { ChevronRight } from "lucide-react";

const SectionTitle = ({ children, action }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-bold text-[17px]">{children}</h2>

      {action && (
        <button className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
          {action}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};

export default SectionTitle;
