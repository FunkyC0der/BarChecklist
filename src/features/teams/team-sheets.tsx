import { Alert, AppText, Button, Input, Sheet } from '@/components/ui';

export function InviteSheet({
  formatExpiry,
  inviteDialogMessage,
  inviteExpiry,
  inviteLink,
  inviteLoading,
  onClose,
  onCopyInvite,
  onCreateInvite,
  onRevokeInvite,
  onShareInvite,
  open,
}: {
  formatExpiry: (value: string) => string;
  inviteDialogMessage: string | null;
  inviteExpiry: string | null;
  inviteLink: string | null;
  inviteLoading: boolean;
  onClose: () => void;
  onCopyInvite: () => void;
  onCreateInvite: () => void;
  onRevokeInvite: () => void;
  onShareInvite: () => void;
  open: boolean;
}) {
  return (
    <Sheet
      description={
        inviteLink
          ? 'Скопіюйте або поширте посилання зараз. Після закриття цього вікна його не можна буде відновити.'
          : undefined
      }
      onClose={onClose}
      open={open}
      title="Запрошення до команди"
    >
      <div className="mt-4 flex flex-col gap-4">
        {inviteLink ? (
          <>
            <Input readOnly label="Посилання" value={inviteLink} />
            {inviteExpiry ? (
              <AppText variant="caption">
                Дійсне до {formatExpiry(inviteExpiry)}.
              </AppText>
            ) : null}
            {inviteDialogMessage ? (
              <Alert color="info">{inviteDialogMessage}</Alert>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={onShareInvite}>Поділитися</Button>
              <Button color="primary" onClick={onCopyInvite}>
                Копіювати
              </Button>
            </div>
            {inviteExpiry ? (
              <Button
                className="btn-block text-error"
                loading={inviteLoading}
                onClick={onRevokeInvite}
                variant="ghost"
              >
                Відкликати
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <AppText variant="caption">
              {inviteExpiry
                ? `Активне запрошення до ${formatExpiry(inviteExpiry)}.`
                : 'Створіть посилання для нових учасників.'}
            </AppText>
            <Button
              className="btn-block"
              color="primary"
              loading={inviteLoading}
              onClick={onCreateInvite}
              size="lg"
            >
              {inviteExpiry ? 'Створити нове посилання' : 'Створити посилання'}
            </Button>
            {inviteExpiry ? (
              <Button
                className="btn-block text-error"
                loading={inviteLoading}
                onClick={onRevokeInvite}
                variant="ghost"
              >
                Відкликати
              </Button>
            ) : null}
          </>
        )}
      </div>
    </Sheet>
  );
}

export function DeleteTeamSheet({
  deleteError,
  deleteLoading,
  deleteName,
  onClose,
  onDelete,
  onDeleteNameChange,
  open,
  teamName,
}: {
  deleteError?: string | null | undefined;
  deleteLoading: boolean;
  deleteName: string;
  onClose: () => void;
  onDelete: () => void;
  onDeleteNameChange: (value: string) => void;
  open: boolean;
  teamName: string;
}) {
  return (
    <Sheet
      description="Ця дія назавжди видалить команду й усі її дочірні дані."
      onClose={onClose}
      open={open}
      title="Видалити команду?"
    >
      <div className="mt-4 flex flex-col gap-4">
        <Input
          error={
            deleteName.length > 0 && deleteName !== teamName
              ? 'Введіть точну назву команди.'
              : undefined
          }
          label={`Введіть «${teamName}» для підтвердження`}
          onChangeText={onDeleteNameChange}
          value={deleteName}
        />
        {deleteError ? <Alert color="error">{deleteError}</Alert> : null}
        <Button
          className="btn-block"
          color="error"
          disabled={deleteName !== teamName}
          loading={deleteLoading}
          onClick={onDelete}
          size="lg"
        >
          Видалити назавжди
        </Button>
        <Button className="btn-block" onClick={onClose} variant="ghost">
          Скасувати
        </Button>
      </div>
    </Sheet>
  );
}
