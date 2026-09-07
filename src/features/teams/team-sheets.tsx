import { Alert, Button, Icon, Input, Sheet } from '@/components/ui';

export function InviteSheet({
  formatExpiry,
  inviteFeedback,
  inviteExpiry,
  inviteLink,
  onClose,
  onShareInvite,
  open,
}: {
  formatExpiry: (value: string) => string;
  inviteFeedback: {
    color: 'error' | 'success';
    text: string;
  } | null;
  inviteExpiry: string | null;
  inviteLink: string | null;
  onClose: () => void;
  onShareInvite: () => void;
  open: boolean;
}) {
  return (
    <Sheet
      description="Після закриття цього вікна посилання не можна буде відновити. Нова генерація замінить попереднє запрошення."
      onClose={onClose}
      open={open}
      title="Запрошення до команди"
    >
      <div className="flex flex-col gap-4">
        {inviteLink ? (
          <>
            <Alert
              className="items-start alert-outline"
              color="success"
              soft={false}
            >
              <Icon className="mt-0.5 shrink-0" name="check" />
              <div>
                <div className="font-semibold">Посилання готове</div>
                <div className="text-sm">
                  {inviteExpiry
                    ? `Дійсне до ${formatExpiry(inviteExpiry)}.`
                    : 'Запрошення створено.'}
                </div>
              </div>
            </Alert>
            {inviteFeedback ? (
              <Alert aria-live="polite" color={inviteFeedback.color}>
                {inviteFeedback.text}
              </Alert>
            ) : null}
            <Button
              className="btn-block"
              color="primary"
              onClick={onShareInvite}
              size="lg"
            >
              <Icon name="share" />
              Поділитися
            </Button>
          </>
        ) : null}
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
      <div className="flex flex-col gap-4">
        <Input
          className="input-sm"
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
