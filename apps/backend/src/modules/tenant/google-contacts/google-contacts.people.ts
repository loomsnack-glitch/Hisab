export type GoogleContactPhone = {
  value?: string;
  canonicalForm?: string;
  type?: string;
};

export type GoogleContactName = {
  unstructuredName?: string;
  givenName?: string;
  familyName?: string;
};

export type GoogleContactPerson = {
  resourceName: string;
  etag?: string;
  names?: GoogleContactName[];
  phoneNumbers?: GoogleContactPhone[];
};

export type GooglePeopleClient = {
  searchContacts: (query: string) => Promise<GoogleContactPerson[]>;
  createContact: (input: { name: string; phone: string }) => Promise<GoogleContactPerson>;
  updateContact: (person: GoogleContactPerson) => Promise<GoogleContactPerson>;
};
