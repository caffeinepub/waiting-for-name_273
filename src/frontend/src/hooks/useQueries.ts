import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Document, Person } from "../backend.d";
import { useActor } from "./useActor";

export function useGetAllPersons() {
  const { actor, isFetching } = useActor();
  return useQuery<Person[]>({
    queryKey: ["persons"],
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPersons();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDocumentsForPerson(personId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Document[]>({
    queryKey: ["documents", personId?.toString()],
    queryFn: async () => {
      if (!actor || personId === null) return [];
      return actor.getDocumentsForPerson(personId);
    },
    enabled: !!actor && !isFetching && personId !== null,
  });
}

export function usePreloadAllDocuments() {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  return useQuery<Document[]>({
    queryKey: ["allDocuments"],
    queryFn: async () => {
      if (!actor) return [];
      const docs = await actor.getAllDocuments();
      // Populate individual per-person caches so person detail pages load instantly
      const byPerson = new Map<string, Document[]>();
      for (const doc of docs) {
        const key = doc.personId.toString();
        if (!byPerson.has(key)) byPerson.set(key, []);
        byPerson.get(key)!.push(doc);
      }
      byPerson.forEach((personDocs, personIdStr) => {
        queryClient.setQueryData(["documents", personIdStr], personDocs);
      });
      return docs;
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useAddPerson() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("No actor");
      return actor.addPerson(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
    },
  });
}

export function useAddDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      personId,
      docType,
      blobId,
    }: {
      personId: bigint;
      docType: string;
      blobId: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addDocument(personId, docType, blobId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["documents", variables.personId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
    },
  });
}

export function useUpdateDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentId,
      newBlobId,
      personId: _personId,
    }: {
      documentId: bigint;
      newBlobId: string;
      personId: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateDocumentBlob(documentId, newBlobId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["documents", variables.personId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
    },
  });
}

export function useDeleteDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentId,
      personId: _personId,
    }: {
      documentId: bigint;
      personId: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteDocument(documentId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["documents", variables.personId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
    },
  });
}

export function useDeletePerson() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (personId: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deletePerson(personId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
    },
  });
}
