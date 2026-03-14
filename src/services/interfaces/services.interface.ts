export interface Service {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  defaultPriority: string;
  displacementPrice: number;
  securityPrice: number;
  vatRateIndividual: number;
  vatRateProfessional: number;
  targetArrivalTimeMinutes: number;
}

export interface IServicesService {
  getActiveServices(): Promise<Service[]>;
  getAllServices(): Promise<Service[]>;
  toggleServiceActive(id: string, isActive: boolean): Promise<void>;
  updateService(id: string, updates: Partial<Service>): Promise<void>;
  swapServiceOrder(serviceId1: string, order1: number, serviceId2: string, order2: number): Promise<void>;
}
