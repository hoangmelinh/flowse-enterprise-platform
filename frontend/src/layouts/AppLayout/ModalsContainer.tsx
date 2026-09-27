import { useSpaceTree } from './SpaceTreeContext';
import CreateSpaceModal from '../../components/Modal/CreateSpaceModal';
import CreateFolderModal from '../../components/Modal/CreateFolderModal';
import CreateListModal from '../../components/Modal/CreateListModal';
import CreateSprintModal from '../../components/Modal/CreateSprintModal';
import InvitePeopleModal from '../../components/InvitePeopleModal';
import CreateWorkspaceDialog from './workspace/CreateWorkspaceDialog';

export default function ModalsContainer() {
    const tree = useSpaceTree();

    return (
        <>
            <CreateSpaceModal
                isOpen={tree.isCreateSpaceOpen}
                onClose={() => tree.setIsCreateSpaceOpen(false)}
                onCreate={tree.handleCreateSpace}
            />
            <CreateFolderModal
                isOpen={!!tree.createFolderTarget}
                onClose={() => tree.setCreateFolderTarget(null)}
                onCreate={tree.handleCreateFolder}
                spaceName={tree.createFolderTarget?.spaceName || ''}
            />
            <CreateListModal
                isOpen={!!tree.createListTarget}
                onClose={() => tree.setCreateListTarget(null)}
                onCreate={tree.handleCreateList}
                folderName={tree.createListTarget?.folderName || ''}
            />
            <CreateSprintModal
                isOpen={!!tree.createSprintTarget}
                onClose={() => tree.setCreateSprintTarget(null)}
                onCreate={tree.handleCreateSprint}
                spaceName={tree.createSprintTarget?.spaceName || ''}
            />
            <CreateWorkspaceDialog
                open={tree.isWorkspaceDialogOpen}
                onOpenChange={tree.setIsWorkspaceDialogOpen}
            />
            <InvitePeopleModal
                open={tree.isInviteModalOpen}
                onOpenChange={tree.setIsInviteModalOpen}
            />
        </>
    );
}

