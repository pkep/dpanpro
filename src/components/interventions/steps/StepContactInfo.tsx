import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { User, Mail, Phone, MapPin, Lock } from 'lucide-react';

interface StepContactInfoProps {
  email: string;
  onEmailChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
  additionalInfo: string;
  onAdditionalInfoChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  skipAccountCreation: boolean;
  onSkipAccountCreationChange: (value: boolean) => void;
}

export function StepContactInfo({
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  address,
  onAddressChange,
  postalCode,
  onPostalCodeChange,
  city,
  onCityChange,
  additionalInfo,
  onAdditionalInfoChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  skipAccountCreation,
  onSkipAccountCreationChange,
}: StepContactInfoProps) {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.email && !email) {
        onEmailChange(user.email);
      }
      if (user.phone && !phone) {
        onPhoneChange(user.phone);
      }
    }
  }, [isAuthenticated, user, email, phone, onEmailChange, onPhoneChange]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Vos coordonnées & adresse</h2>
        <p className="text-muted-foreground mt-2">
          Pour vous contacter et localiser l'intervention
        </p>
      </div>

      {isAuthenticated && user && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <User className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-muted-foreground">Connecté</p>
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Adresse email *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="votre@email.com"
            className="mt-2"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Nous vous enverrons les mises à jour de votre intervention par email
          </p>
        </div>

        <div>
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Numéro de téléphone *
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="06 12 34 56 78"
            className="mt-2"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Le technicien vous contactera à ce numéro
          </p>
      </div>

      {/* Account Creation */}
      {!isAuthenticated && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lock className="h-4 w-4" />
            Création de compte
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="skipAccount"
              checked={skipAccountCreation}
              onCheckedChange={(checked) => onSkipAccountCreationChange(checked === true)}
            />
            <Label htmlFor="skipAccount" className="text-sm font-normal cursor-pointer">
              Continuer en tant qu'invité (sans créer de compte)
            </Label>
          </div>

          {!skipAccountCreation && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 caractères"
                  className="mt-2"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Retapez votre mot de passe"
                  className="mt-2"
                  value={confirmPassword}
                  onChange={(e) => onConfirmPasswordChange(e.target.value)}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1">
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Address Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4" />
          Adresse d'intervention
        </div>

        <div>
          <Label htmlFor="address">Adresse *</Label>
          <Input
            id="address"
            placeholder="123 rue de la Paix"
            className="mt-2"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="postalCode">Code postal *</Label>
            <Input
              id="postalCode"
              placeholder="75001"
              maxLength={5}
              className="mt-2"
              value={postalCode}
              onChange={(e) => onPostalCodeChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="city">Ville *</Label>
            <Input
              id="city"
              placeholder="Paris"
              className="mt-2"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="additionalInfo">Informations complémentaires (optionnel)</Label>
          <Textarea
            id="additionalInfo"
            placeholder="Digicode, étage, bâtiment, instructions d'accès..."
            className="min-h-[80px] mt-2"
            value={additionalInfo}
            onChange={(e) => onAdditionalInfoChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
