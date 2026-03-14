import { AdminLayout } from '@/components/admin/AdminLayout';
import { QuestionnaireManager } from '@/components/admin/questionnaire/QuestionnaireManager';

const AdminQuestionnairePage = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion Questionnaire</h1>
          <p className="text-muted-foreground mt-1">
            Créez et gérez l'arbre de questions, réponses et résultats tarifés par domaine.
          </p>
        </div>
        <QuestionnaireManager />
      </div>
    </AdminLayout>
  );
};

export default AdminQuestionnairePage;
