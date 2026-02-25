import { 
  FaWhatsapp, 
  FaTelegramPlane, 
  FaInstagram, 
  FaLine, 
  FaTwitter, 
  FaDiscord, 
  FaSnapchatGhost, 
  FaVk,
  FaGoogle,
  FaMicrosoft
} from 'react-icons/fa';
import { SiZalo, SiTinder, SiGooglechat } from 'react-icons/si';

import type { ServiceItem } from '../types';

export const AVAILABLE_SERVICES: ServiceItem[] = [
  { id: 'wa', name: 'WhatsApp', icon: <FaWhatsapp size={24} />, color: '#25D366', bgColor: 'bg-green-100' },
  { id: 'tg', name: 'Telegram', icon: <FaTelegramPlane size={24} />, color: '#0088cc', bgColor: 'bg-blue-100' },
  { id: 'ig', name: 'Instagram', icon: <FaInstagram size={24} />, color: '#E4405F', bgColor: 'bg-pink-100' },
  { id: 'ln', name: 'Line', icon: <FaLine size={24} />, color: '#00C300', bgColor: 'bg-green-50' },
  { id: 'lnw', name: 'Line Work', icon: <FaLine size={24} />, color: '#00C300', bgColor: 'bg-green-50' },
  { id: 'lnb', name: 'Line商用', icon: <FaLine size={24} />, color: '#00C300', bgColor: 'bg-green-50' },
  { id: 'tk', name: 'Tiktok', icon: <span className="font-bold text-lg">Tk</span>, color: '#000000', bgColor: 'bg-gray-200' },
  { id: 'tw', name: 'Twitter', icon: <FaTwitter size={24} />, color: '#1DA1F2', bgColor: 'bg-sky-50' },
  { id: 'zl', name: 'Zalo', icon: <SiZalo size={24} />, color: '#0068FF', bgColor: 'bg-blue-50' },
  { id: 'gc', name: 'Google\nchat', icon: <SiGooglechat size={24} />, color: '#00AC47', bgColor: 'bg-green-50' },
  { id: 'td', name: 'Tinder', icon: <SiTinder size={24} />, color: '#FE3C72', bgColor: 'bg-pink-50' },
  { id: 'dc', name: 'Discord', icon: <FaDiscord size={24} />, color: '#5865F2', bgColor: 'bg-indigo-50' },
  { id: 'tn', name: 'Textnow', icon: <span className="font-bold text-xs">Tn</span>, color: '#000000', bgColor: 'bg-gray-100' },
  { id: 'gv', name: 'Google\nvoice', icon: <FaGoogle size={24} />, color: '#4285F4', bgColor: 'bg-blue-50' },
  { id: 'idx', name: 'Index', icon: <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px]">in</div>, color: '#1877F2', bgColor: 'bg-blue-50' },
  { id: 'sc', name: 'Snapchat', icon: <FaSnapchatGhost size={24} />, color: '#FFFC00', bgColor: 'bg-yellow-50' },
  { id: 'tf', name: 'Textfree', icon: <span className="font-bold text-xs">Tf</span>, color: '#666', bgColor: 'bg-purple-50' },
  { id: 'vk', name: 'VK', icon: <FaVk size={24} />, color: '#4680C2', bgColor: 'bg-blue-50' },
  { id: 'bp', name: 'bip', icon: <span className="font-bold text-xs text-blue-500">bi</span>, color: '#00A3E0', bgColor: 'bg-sky-50' },
  { id: 'bt', name: 'Botim', icon: <span className="font-bold text-xs text-blue-500">b</span>, color: '#000', bgColor: 'bg-white' },
  { id: 'tm', name: 'Teams', icon: <FaMicrosoft size={24} />, color: '#6264A7', bgColor: 'bg-indigo-50' },
];
