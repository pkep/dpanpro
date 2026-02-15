import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const ContactPage = () => {
  const [profileType, setProfileType] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileType || !firstName.trim() || !lastName.trim() || !email.trim() || !message.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setIsSubmitting(true);
    // Simulate sending
    await new Promise((r) => setTimeout(r, 1000));
    toast.success('Votre message a bien été envoyé. Nous vous répondrons dans les plus brefs délais.');
    setProfileType('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setMessage('');
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-3xl font-bold mb-2 text-center">Contactez-nous</h1>
        <p className="text-muted-foreground text-center mb-10">
          Une question, une demande ? N'hésitez pas à nous contacter.
        </p>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Contact info */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Téléphone</p>
                    <p className="text-sm text-muted-foreground">0 800 123 456</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Email</p>
                    <p className="text-sm text-muted-foreground">contact@depan-pro.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Adresse</p>
                    <p className="text-sm text-muted-foreground">Paris, France</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">Envoyez-nous un message</CardTitle>
              <CardDescription>
                Remplissez le formulaire ci-dessous et nous vous répondrons dans les meilleurs délais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="profileType">Vous êtes *</Label>
                  <Select value={profileType} onValueChange={setProfileType}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Sélectionnez votre profil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="particulier">Particulier</SelectItem>
                      <SelectItem value="entreprise">Entreprise</SelectItem>
                      <SelectItem value="technicien">Technicien</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      className="mt-1.5"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Dupont"
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      className="mt-1.5"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jean"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      className="mt-1.5"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jean.dupont@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      className="mt-1.5"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    className="mt-1.5 min-h-[120px]"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Décrivez votre demande..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
