import { ClientLayout } from '@/components/client/ClientLayout';
import { InterventionWizard } from '@/components/interventions/InterventionWizard';

const ClientNewInterventionPage = () => {
  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Nouvelle demande d'intervention</h1>
          <p className="text-muted-foreground">
            Décrivez votre problème et nous vous mettrons en relation avec un technicien qualifié.
          </p>
        </div>
        
        <InterventionWizard embedded={true} />
      </div>
    </ClientLayout>
  );
};

export default ClientNewInterventionPage;
