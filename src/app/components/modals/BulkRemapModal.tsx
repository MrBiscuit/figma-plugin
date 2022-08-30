import React from 'react';
import Modal from '../Modal';
import Heading from '../Heading';
import Button from '../Button';
import Stack from '../Stack';
import Input from '../Input';
import useTokens from '../../store/useTokens';

type Props = {
  isOpen: boolean
  onClose: () => void;
};

export default function BulkRemapModal({ isOpen, onClose }: Props) {
  const [oldName, setOldName] = React.useState('');
  const [newName, setNewName] = React.useState('');
  const { handleBulkRemap } = useTokens();

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const onConfirm = React.useCallback(async () => {
    await handleBulkRemap(newName, oldName);
    onClose();
  }, [handleBulkRemap, onClose, newName, oldName]);

  const handleOldNameChange = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>((e) => {
    e.persist();
    setOldName(e.target.value);
  }, [oldName]);

  const handleNewNameChange = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>((e) => {
    e.persist();
    setNewName(e.target.value);
  }, [newName]);

  return (
    <Modal large isOpen={isOpen} close={handleClose}>
      <form
        onSubmit={onConfirm}
      >
        <Stack direction="column" gap={4} css={{ minHeight: '215px', justifyContent: 'center' }}>
          <Stack direction="column" gap={2}>
            <Heading>
              Choose a new token for
            </Heading>
          </Stack>
          <Input
            full
            required
            autofocus
            type="text"
            label="Match"
            value={oldName}
            placeholder=""
            onChange={handleOldNameChange}
            name="oldName"
          />
          <Input
            required
            full
            type="text"
            label="Remap"
            value={newName}
            placeholder=""
            onChange={handleNewNameChange}
            name="newName"
          />
          <Stack direction="row" gap={4} justify="between">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Remap
            </Button>
          </Stack>
        </Stack>
      </form>
    </Modal>
  );
}
