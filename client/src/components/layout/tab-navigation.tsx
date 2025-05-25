import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { FaTwitter, FaLinkedin, FaYoutube, FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { MdStickyNote2, MdBook, MdDescription } from 'react-icons/md';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  iconColor?: string;
  path: string;
}

interface TabNavigationProps {
  activeTab?: string;
}

export default function TabNavigation({ activeTab }: TabNavigationProps) {
  const [location, navigate] = useLocation();
  const [active, setActive] = useState<string>(activeTab || 'notes');
  
  useEffect(() => {
    // Extract tab from the location path
    const currentPath = location.substring(1) || 'home';
    setActive(currentPath);
  }, [location]);

  const tabs: TabItem[] = [
    { id: 'twitter', label: 'Twitter', icon: <FaXTwitter size={18} />, iconColor: '#000000', path: '/twitter' },
    { id: 'linkedin', label: 'LinkedIn', icon: <FaLinkedin size={18} />, iconColor: '#0A66C2', path: '/linkedin' },
    { id: 'youtube', label: 'YouTube', icon: <FaYoutube size={18} />, iconColor: '#FF0000', path: '/youtube' },
    { id: 'instagram', label: 'Instagram', icon: <FaInstagram size={18} />, iconColor: '#E4405F', path: '/instagram' },
    { id: 'facebook', label: 'Facebook', icon: <FaFacebook size={18} />, iconColor: '#1877F2', path: '/facebook' },
    { id: 'whatsapp', label: 'WhatsApp', icon: <FaWhatsapp size={18} />, iconColor: '#25D366', path: '/whatsapp' },
    { id: 'notes', label: 'Notes', icon: <MdStickyNote2 size={18} />, iconColor: '#F59E0B', path: '/notes' },
    { id: 'journal', label: 'Journal', icon: <MdBook size={18} />, iconColor: '#6B7280', path: '/journal' },
    { id: 'docs', label: 'Docs', icon: <MdDescription size={18} />, iconColor: '#6366F1', path: '/docs' },
  ];

  const handleTabClick = (tabId: string, path: string) => {
    setActive(tabId);
    navigate(path);
  };

  return (
    <div className="bg-[#022958] text-white overflow-x-auto scrollbar-hide">
      <div className="flex min-w-max items-center">
        <div className="flex">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              className={`px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium relative group ${
                active === tab.id ? 'text-white' : 'text-gray-300 hover:text-white'
              }`}
              onClick={() => handleTabClick(tab.id, tab.path)}
            >
              <div className="flex flex-col sm:flex-row items-center">
                <span 
                  className="sm:mr-1.5 mb-1 sm:mb-0" 
                  style={{ color: active === tab.id ? 'white' : tab.iconColor }}
                >
                  {tab.icon}
                </span>
                <span className="text-[10px] sm:text-sm">{tab.label}</span>
              </div>
              <div 
                className={`absolute bottom-0 left-0 h-0.5 w-full bg-[#FF9C6B] transition-transform duration-300 ease-in-out ${
                  active === tab.id ? 'scale-x-100' : 'scale-x-0'
                }`}
              ></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
