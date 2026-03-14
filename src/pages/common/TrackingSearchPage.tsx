import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin } from 'lucide-react';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';

const TrackingSearchPage = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = trackingCode.trim();
    if (code) {
      navigate(`/track/${code}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Suivre mon intervention</CardTitle>
            <CardDescription>
              Entrez votre code de suivi pour consulter l'état de votre intervention en temps réel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Ex : ABC123"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-widest"
                maxLength={20}
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={!trackingCode.trim()}>
                <Search className="mr-2 h-4 w-4" />
                Rechercher
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default TrackingSearchPage;
