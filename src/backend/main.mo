import Map "mo:core/Map";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import MixinStorage "blob-storage/Mixin";

actor {
  include MixinStorage();

  type Person = {
    id : Nat;
    name : Text;
  };

  type Document = {
    id : Nat;
    personId : Nat;
    docType : Text;
    blobId : Text;
    createdAt : Int;
  };

  stable var stableNextPersonId : Nat = 0;
  stable var stableNextDocumentId : Nat = 0;
  stable var stablePersons : [(Nat, Person)] = [];
  stable var stableDocuments : [(Nat, Document)] = [];

  var nextPersonId = stableNextPersonId;
  var nextDocumentId = stableNextDocumentId;

  let persons = Map.empty<Nat, Person>();
  let documents = Map.empty<Nat, Document>();

  system func preupgrade() {
    stablePersons := persons.entries().toArray();
    stableDocuments := documents.entries().toArray();
    stableNextPersonId := nextPersonId;
    stableNextDocumentId := nextDocumentId;
  };

  // Restore data after upgrade (this runs on every upgrade, unlike actor init)
  system func postupgrade() {
    nextPersonId := stableNextPersonId;
    nextDocumentId := stableNextDocumentId;
    for ((k, v) in stablePersons.vals()) {
      persons.add(k, v);
    };
    for ((k, v) in stableDocuments.vals()) {
      documents.add(k, v);
    };
    stablePersons := [];
    stableDocuments := [];
  };

  public shared ({ caller }) func addPerson(name : Text) : async Nat {
    let id = nextPersonId;
    nextPersonId += 1;
    let person : Person = {
      id;
      name;
    };
    persons.add(id, person);
    id;
  };

  public shared ({ caller }) func deletePerson(id : Nat) : async () {
    persons.remove(id);
  };

  public query ({ caller }) func getAllPersons() : async [Person] {
    persons.values().toArray();
  };

  public query ({ caller }) func searchPersons(searchTerm : Text) : async [Person] {
    persons.values().toArray().filter(
      func(person) {
        person.name.contains(#text searchTerm);
      }
    );
  };

  public shared ({ caller }) func addDocument(personId : Nat, docType : Text, blobId : Text) : async Nat {
    let id = nextDocumentId;
    nextDocumentId += 1;
    let document : Document = {
      id;
      personId;
      docType;
      blobId;
      createdAt = Time.now();
    };
    documents.add(id, document);
    id;
  };

  public query ({ caller }) func getDocumentsForPerson(personId : Nat) : async [Document] {
    documents.values().toArray().filter(
      func(doc) { doc.personId == personId }
    );
  };

  public shared ({ caller }) func updateDocumentBlob(documentId : Nat, newBlobId : Text) : async Bool {
    switch (documents.get(documentId)) {
      case (null) { false };
      case (?doc) {
        let updatedDoc = {
          doc with
          blobId = newBlobId;
        };
        documents.add(documentId, updatedDoc);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteDocument(documentId : Nat) : async () {
    documents.remove(documentId);
  };

  public shared ({ caller }) func getPerson(id : Nat) : async ?Person {
    persons.get(id);
  };

  public shared ({ caller }) func getDocument(id : Nat) : async ?Document {
    documents.get(id);
  };

  public shared ({ caller }) func deleteAllDocuments() : async () {
    documents.clear();
  };

  public shared ({ caller }) func getAllDocuments() : async [Document] {
    documents.values().toArray();
  };
};
