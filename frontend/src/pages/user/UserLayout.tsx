import { Outlet } from 'react-router-dom';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function UserLayout() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-forno-bg-primary pt-20">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
