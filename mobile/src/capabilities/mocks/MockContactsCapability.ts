import { IContactsCapability, ResolvedContact } from '../interfaces/IContactsCapability';

export class MockContactsCapability implements IContactsCapability {
  private mockContacts: ResolvedContact[] = [
    { id: 'cnt_001_huda', displayName: 'هدى', hasPhoneNumber: true },
    { id: 'cnt_002_ahmad', displayName: 'أحمد النجار', hasPhoneNumber: true },
    { id: 'cnt_003_khalil', displayName: 'أحمد خليل', hasPhoneNumber: true },
    { id: 'cnt_004_doctor', displayName: 'د. طارق عيون', hasPhoneNumber: true },
  ];

  public async searchContacts(query: string): Promise<ResolvedContact[]> {
    if (!query) return [];
    const q = query.trim().toLowerCase();
    return this.mockContacts.filter((c) => c.displayName.toLowerCase().includes(q));
  }

  public async getContactById(contactId: string): Promise<ResolvedContact | null> {
    return this.mockContacts.find((c) => c.id === contactId) || null;
  }
}

export const mockContactsCapability = new MockContactsCapability();
