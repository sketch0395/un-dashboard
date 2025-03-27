
import Head from 'next/head';
import SpeedTest from './components/speedtest';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Network Dashboard</title>
        <meta name="description" content="Network Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Welcome to the Network Dashboard</h1>
        <SpeedTest />
      </main>
    </div>
  );
}