import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, MessageSquare, Mail, Clock } from 'lucide-react';

export function NextStepsCard() {
  const steps = [
    {
      icon: CheckCircle2,
      text: 'Un artisan qualifié vous contactera dans les plus brefs délais',
      iconColor: 'text-green-600',
    },
    {
      icon: MessageSquare,
      text: 'Vous recevrez un SMS avec les détails de l\'intervention',
      iconColor: 'text-blue-600',
    },
    {
      icon: Mail,
      text: 'Un email de confirmation vous a été envoyé',
      iconColor: 'text-purple-600',
    },
    {
      icon: Clock,
      text: 'Intervention d\'urgence : un artisan sera dépêché rapidement',
      iconColor: 'text-orange-600',
    },
  ];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Prochaines étapes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <step.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${step.iconColor}`} />
              <span className="text-sm">{step.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
