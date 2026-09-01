import React from 'react';
import { Navigation, BarChart2, AlertTriangle, Bot, Siren, Sliders } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'route', label: 'Route Planner', icon: Navigation },
    { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart2 },
    { id: 'signals', label: 'Adaptive Signals', icon: Sliders },
    { id: 'hotspots', label: 'Accident Hotspots', icon: AlertTriangle },
    { id: 'insights', label: 'AI Traffic Assistant', icon: Bot },
    { id: 'dispatch', label: 'Emergency Routing', icon: Siren },
  ];

  return (
    <div className="w-64 bg-[#0d121d] border-r border-slate-800 flex flex-col justify-between p-4 z-20 shadow-xl select-none">
      <div>
        {/* Clean Header matching your original vision */}
        <div className="flex items-center space-x-2.5 px-3 py-4 mb-6 border-b border-slate-800">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold text-sm tracking-wider uppercase text-slate-100 font-sans">
            Traffic Management System
          </span>
        </div>

        {/* Human Navigation Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#182132] text-amber-400 border-l-2 border-amber-500 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141b29]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

     
    </div>
  );
};

export default Sidebar;