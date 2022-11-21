import { ModalWallet } from 'modals/modals/ModalWallet';
import {
  ModalTokenList,
  ModalTokenListData,
} from 'modals/modals/ModalTokenList';
import { TModals } from 'modals/modals.types';
import {
  ModalCreateConfirm,
  ModalTxConfirmData,
} from 'modals/modals/ModalCreateConfirm';

// Step 1: Add modal key and data type to schema
export interface ModalSchema {
  wallet: undefined;
  tokenLists: ModalTokenListData;
  txConfirm: ModalTxConfirmData;
}

// Step 2: Create component in modals/modals folder

// Step 3: Add modal component here
export const MODAL_COMPONENTS: TModals = {
  wallet: (props) => ModalWallet(props),
  tokenLists: (props) => ModalTokenList(props),
  txConfirm: (props) => ModalCreateConfirm(props),
};
