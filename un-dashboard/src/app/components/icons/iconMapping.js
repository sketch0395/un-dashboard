// Development icons
import { DiGithubBadge, DiDocker, DiNpm, DiCode, DiReact, DiMongodb, DiPostgresql, DiVisualstudio, DiJavascript, DiPython } from 'react-icons/di';

// Service & platform icons
import { 
  SiNetlify, SiVercel, SiFirebase, SiAmazonaws, SiMicrosoftazure, SiGooglecloud, 
  SiJira, SiConfluence, SiTrello, SiNotion, SiAsana, SiSlack, SiDiscord, SiMicrosoftteams,
  SiVisualstudiocode, SiIntellijidea, SiGitlab, SiStackoverflow, SiPostman,
  SiFigma, SiAdobexd, SiAdobephotoshop, SiAdobeillustrator,
  SiJenkins, SiCircleci, SiTravisci, SiKubernetes, SiGrafana, SiKibana,
  SiGooglechrome, SiFirefox, SiMicrosoftedge, SiNgrok, SiUbuntu, SiLinux,
  SiJupyter, SiMysql, SiRedis, SiClickup, SiLinear
} from 'react-icons/si';

// General purpose icons
import { 
  FaDatabase, FaServer, FaToolbox, FaLink, FaGlobe, FaGoogle, FaMicrosoft, 
  FaCode, FaTerminal, FaFile, FaTable, FaChartBar, FaBook, FaCalendar, 
  FaEnvelope, FaSearch, FaCloud, FaVideo, FaMusic, FaLaptopCode
} from 'react-icons/fa';

// Icon mapping for common services and applications
export const iconMap = {
  // Development platforms
  'github': <DiGithubBadge />,
  'gitlab': <SiGitlab />,
  'docker': <DiDocker />,
  'npm': <DiNpm />,
  'react': <DiReact />,
  'javascript': <DiJavascript />,
  'python': <DiPython />,
  
  // Databases
  'mongodb': <DiMongodb />,
  'postgresql': <DiPostgresql />,
  'mysql': <SiMysql />,
  'redis': <SiRedis />,
  
  // Cloud platforms
  'netlify': <SiNetlify />,
  'vercel': <SiVercel />,
  'firebase': <SiFirebase />,
  'aws': <SiAmazonaws />,
  'azure': <SiMicrosoftazure />,
  'gcp': <SiGooglecloud />,
  
  // Project management & documentation
  'jira': <SiJira />,
  'confluence': <SiConfluence />,
  'trello': <SiTrello />,
  'notion': <SiNotion />,
  'asana': <SiAsana />,
  'clickup': <SiClickup />,
  'linear': <SiLinear />,
  
  // Communication
  'slack': <SiSlack />,
  'discord': <SiDiscord />,
  'teams': <SiMicrosoftteams />,
  'microsoft teams': <SiMicrosoftteams />,
  'email': <FaEnvelope />,
  
  // Development tools
  'vscode': <SiVisualstudiocode />,
  'visual studio code': <SiVisualstudiocode />,
  'visual studio': <DiVisualstudio />,
  'intellij': <SiIntellijidea />,
  'stackoverflow': <SiStackoverflow />,
  'stack overflow': <SiStackoverflow />,
  'postman': <SiPostman />,
  'terminal': <FaTerminal />,
  'code': <FaCode />,
  'jupyter': <SiJupyter />,
  'ngrok': <SiNgrok />,
  
  // Design tools
  'figma': <SiFigma />,
  'adobe xd': <SiAdobexd />,
  'xd': <SiAdobexd />,
  'photoshop': <SiAdobephotoshop />,
  'illustrator': <SiAdobeillustrator />,
  
  // CI/CD & Monitoring
  'jenkins': <SiJenkins />,
  'circleci': <SiCircleci />,
  'travis': <SiTravisci />,
  'kubernetes': <SiKubernetes />,
  'k8s': <SiKubernetes />,
  'grafana': <SiGrafana />,
  'kibana': <SiKibana />,
  
  // Browsers
  'chrome': <SiGooglechrome />,
  'firefox': <SiFirefox />,
  'edge': <SiMicrosoftedge />,
  
  // Operating systems
  'ubuntu': <SiUbuntu />,
  'linux': <SiLinux />,
  
  // Productivity
  'google': <FaGoogle />,
  'google docs': <FaFile />,
  'google sheets': <FaTable />,
  'microsoft': <FaMicrosoft />,
  'office': <FaMicrosoft />,
  'calendar': <FaCalendar />,
  'analytics': <FaChartBar />,
  'docs': <FaBook />,
  'search': <FaSearch />,
  
  // Generic categories
  'database': <FaDatabase />,
  'server': <FaServer />,
  'tools': <FaToolbox />,
  'web': <FaGlobe />,
  'cloud': <FaCloud />,
  'development': <FaLaptopCode />,
  'video': <FaVideo />,
  'music': <FaMusic />,
  'default': <FaLink />
};

// Helper function to determine icon
export const getIconForLink = (link) => {
  // Check if URL contains known services
  const url = link.url.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (url.includes(key)) {
      return icon;
    }
  }
  
  // Check if name matches any icon names (case insensitive)
  const name = link.name.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (name.includes(key)) {
      return icon;
    }
  }
  
  // Check if category matches any icon names
  if (link.category && iconMap[link.category.toLowerCase()]) {
    return iconMap[link.category.toLowerCase()];
  }
  
  // Default icon
  return iconMap.default;
};