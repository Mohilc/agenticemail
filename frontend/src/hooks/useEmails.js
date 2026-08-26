import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService } from '../services/emailService';

export const useEmails = (folder, params = {}) => {
  const queryClient = useQueryClient();

  // Query emails list
  const emailsQuery = useQuery({
    queryKey: ['emails', folder, params],
    queryFn: () => emailService.getByFolder(folder, params),
    keepPreviousData: true,
  });

  // Query email detail
  const useEmailDetail = (id) => {
    return useQuery({
      queryKey: ['email', id],
      queryFn: () => emailService.getById(id),
      enabled: !!id,
    });
  };

  // Query folder counts
  const countsQuery = useQuery({
    queryKey: ['emailCounts'],
    queryFn: () => emailService.getCounts(),
    refetchInterval: 30000, // Polling every 30s
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => emailService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['emailCounts'] });
    },
  });

  const trashMutation = useMutation({
    mutationFn: (id) => emailService.moveToTrash(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['emailCounts'] });
    },
  });

  return {
    emailsQuery,
    countsQuery,
    useEmailDetail,
    updateEmail: updateMutation.mutateAsync,
    trashEmail: trashMutation.mutateAsync,
  };
};
