import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const dashboardItems = [
    {
      title: 'Docker Manager',
      description: 'Manage and monitor Docker containers',
      icon: '/window.svg',
      link: '/docker',
      color: 'bg-blue-500',
    },
    {
      title: 'Network Scan',
      description: 'Scan and visualize your network',
      icon: '/globe.svg',
      link: '/networkscan',
      color: 'bg-green-500',
    },
    {
      title: 'Performance',
      description: 'Monitor system and network performance',
      icon: '/file.svg',
      link: '/performance',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <section className="mb-12 pt-6">
          <h1 className="text-4xl font-bold mb-2">Welcome to UN-Dashboard</h1>
          <p className="text-xl text-gray-400">Your unified dashboard for system monitoring and management</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {dashboardItems.map((item, index) => (
            <Link href={item.link} key={index}>
              <div className={`${item.color} hover:opacity-90 transition-opacity rounded-lg p-6 h-full flex flex-col`}>
                <div className="flex items-center mb-4">
                  <div className="bg-white bg-opacity-20 p-3 rounded-lg mr-4">
                    <Image src={item.icon} alt={item.title} width={24} height={24} />
                  </div>
                  <h2 className="text-2xl font-bold">{item.title}</h2>
                </div>                <p className="text-white text-opacity-90">{item.description}</p>
                <div className="text-sm flex items-center justify-end mt-auto">
                  <span>Open Dashboard</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">System Overview</h2>
          <p className="text-gray-400 mb-4">
            UN-Dashboard provides a comprehensive view of your system resources, Docker containers, and network.
            Monitor performance, scan your network, and manage Docker containers all from one place.
          </p>
          <p className="text-gray-400">
            Select one of the dashboard panels above to get started.
          </p>
        </section>
      </div>
    </div>
  );
}
