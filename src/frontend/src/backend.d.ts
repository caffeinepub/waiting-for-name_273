import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Document {
    id: bigint;
    createdAt: bigint;
    personId: bigint;
    blobId: string;
    docType: string;
}
export interface Person {
    id: bigint;
    name: string;
}
export interface backendInterface {
    addDocument(personId: bigint, docType: string, blobId: string): Promise<bigint>;
    addPerson(name: string): Promise<bigint>;
    deleteAllDocuments(): Promise<void>;
    deleteDocument(documentId: bigint): Promise<void>;
    deletePerson(id: bigint): Promise<void>;
    getAllDocuments(): Promise<Array<Document>>;
    getAllPersons(): Promise<Array<Person>>;
    getDocument(id: bigint): Promise<Document | null>;
    getDocumentsForPerson(personId: bigint): Promise<Array<Document>>;
    getPerson(id: bigint): Promise<Person | null>;
    searchPersons(searchTerm: string): Promise<Array<Person>>;
    updateDocumentBlob(documentId: bigint, newBlobId: string): Promise<boolean>;
}
