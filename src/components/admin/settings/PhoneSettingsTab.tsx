import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Phone, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PhoneSettingsTab() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPhoneNumber();
  }, []);

  const fetchPhoneNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'phone_number')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPhoneNumber(data.setting_value);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du téléphone:', error);
      toast.error('Erreur lors du chargement du numéro de téléphone');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Le numéro de téléphone ne peut pas être vide');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          setting_value: phoneNumber.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'phone_number');

      if (error) throw error;
      toast.success('Numéro de téléphone mis à jour');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Configuration du téléphone
        </CardTitle>
        <CardDescription>
          Numéro de téléphone standard affiché sur l'ensemble du site (header, footer, pages de contact)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Numéro de téléphone</Label>
          <div className="flex gap-2">
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0 800 123 456"
              className="max-w-xs"
            />
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Format recommandé : 0 800 123 456 ou +33 1 23 45 67 89
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
