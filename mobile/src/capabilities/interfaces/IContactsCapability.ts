export interface ResolvedContact {
  id: string;
  displayName: string;
  hasPhoneNumber: boolean;
}

export interface IContactsCapability {
  searchContacts(query: string): Promise<ResolvedContact[]>;
  getContactById(contactId: string): Promise<ResolvedContact | null>;
}
