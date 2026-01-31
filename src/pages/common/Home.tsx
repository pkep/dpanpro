import { Header } from '@/components/home/Header';
import { HeroSection } from '@/components/home/HeroSection';
import { KeyFigures } from '@/components/home/KeyFigures';
import { ServicesSection } from '@/components/home/ServicesSection';
import { HowItWorks } from '@/components/home/HowItWorks';
import { BecomePartner } from '@/components/home/BecomePartner';
import { Footer } from '@/components/home/Footer';

const Home = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <KeyFigures />
        <section id="services">
          <ServicesSection />
        </section>
        <HowItWorks />
        <BecomePartner />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
