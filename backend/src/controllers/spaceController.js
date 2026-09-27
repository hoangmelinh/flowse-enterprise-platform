import { findAllSpacesByWorkspaceId, createSpaces, findSpaceById, updateSpace, deleteSpace, findSpaceMembers, removeSpaceMember, addSpaceMember } from "../models/Spaces.js";
import { findFoldersBySpaceId, findFoldersBySpaceIds } from "../models/Folders.js";
import { findListsBySpaceId, findListsBySpaceIds } from "../models/Lists.js";
import { findSprintsBySpaceIds } from "../models/Sprints.js";

export const getSpacesByWorkspaceId = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    if (!workspaceId) {
      return res.status(400).json({ error: "Workspace ID is required" });
    }

    const spaces = await findAllSpacesByWorkspaceId(workspaceId, req.user?.user_id);

    if (!spaces || spaces.length === 0) {
      return res.status(200).json({ status: "success", data: [] });
    }

    const spaceIds = spaces.map(space => space.space_id);

    const [folders, allLists, allSprints] = await Promise.all([
      findFoldersBySpaceIds(spaceIds),
      findListsBySpaceIds(spaceIds),
      findSprintsBySpaceIds(spaceIds)
    ]);

    const listsByFolder = {};
    const directListsBySpace = {};
    const sprintsByFolder = {};
    const directSprintsBySpace = {};

    (allLists || []).forEach(list => {
      if (list.folder_id) {
        if (!listsByFolder[list.folder_id]) listsByFolder[list.folder_id] = [];
        listsByFolder[list.folder_id].push(list);
      } else {
        if (!directListsBySpace[list.space_id]) directListsBySpace[list.space_id] = [];
        directListsBySpace[list.space_id].push(list);
      }
    });

    (allSprints || []).forEach(sprint => {
      if (sprint.folder_id) {
        if (!sprintsByFolder[sprint.folder_id]) sprintsByFolder[sprint.folder_id] = [];
        sprintsByFolder[sprint.folder_id].push(sprint);
      } else {
        if (!directSprintsBySpace[sprint.space_id]) directSprintsBySpace[sprint.space_id] = [];
        directSprintsBySpace[sprint.space_id].push(sprint);
      }
    });

    const foldersBySpace = {};
    (folders || []).forEach(folder => {
      const formattedFolder = {
        ...folder,
        lists: listsByFolder[folder.folder_id] || [],
        sprints: sprintsByFolder[folder.folder_id] || [] 
      };

      if (!foldersBySpace[folder.space_id]) foldersBySpace[folder.space_id] = [];
      foldersBySpace[folder.space_id].push(formattedFolder);
    });

    const finalData = spaces.map(space => ({
      spaceId: space.space_id,
      name: space.name,
      description: space.description,
      color: space.color,
      icon: space.icon,
      isPrivate: space.is_private,
      folders: foldersBySpace[space.space_id] || [],
      lists: directListsBySpace[space.space_id] || [],
      sprints: directSprintsBySpace[space.space_id] || [] 
    }));

    return res.status(200).json({
      status: "success",
      data: finalData
    });

  } catch (error) {
    console.error("Error in getSpacesByWorkspaceId:", error);
    return res.status(500).json({ error: "Failed to retrieve spaces" });
  }
};
export const createSpace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, isPrivate } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: "Workspace ID là bắt buộc." });
    }
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Tên Space không được để trống." });
    }

    const normalizedIsPrivate = isPrivate ?? false;

    const newSpace = await createSpaces(
      name.trim(),
      description,
      workspaceId,
      normalizedIsPrivate,
      {
        createdBy: req.user?.user_id,
        addCreatorAsMember: normalizedIsPrivate,
      },
    );

    res.status(201).json({
      message: "Tạo Space và các trạng thái mặc định thành công.",
      data: newSpace
    });

  } catch (error) {
    console.error(" [Controller createSpace] Error:", error.message);

    if (error.code === '23505') {
      return res.status(409).json({ error: "Tên Space đã tồn tại trong Workspace này." });
    }

    res.status(500).json({ error: "Không thể tạo Space. Vui lòng thử lại sau." });
  }
};
export const getSpaceById = async (req, res) => {
  try {
    const { spaceId } = req.params;
    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    const space = await findSpaceById(spaceId);
    if (!space) {
      return res.status(404).json({ error: "Space not found" });
    }
    res.status(200).json(space);

  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve space" });
  }
};
export const updateSpaces = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { name, description, isPrivate } = req.body;
    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    if (!name) {
      return res.status(400).json({ error: "Space name is required" });
    }
    const normalizedIsPrivate = isPrivate ?? false;
    const updatedSpace = await updateSpace(spaceId, name, description, normalizedIsPrivate);

    if (!updatedSpace) {
      return res.status(404).json({ error: "Space not found" });
    }

    if (normalizedIsPrivate) {
      await addSpaceMember(spaceId, req.user?.user_id);
    }

    res.status(200).json(updatedSpace);
  } catch (error) {
    res.status(500).json({ error: "Failed to update space" });
  }
};
export const deleteSpaces = async (req, res) => {
  try {
    const { spaceId } = req.params;
    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    const ok = await deleteSpace(spaceId);
    if (!ok) {
      return res.status(404).json({ error: "Space not found" });
    }
    res.status(200).json({ message: "Space deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete space" });
  }
};


export const getSpaceDetails = async (req, res) => {
  try {
    const { spaceId } = req.params;

    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }


    const space = await findSpaceById(spaceId);
    if (!space) {
      return res.status(404).json({ error: "Space not found" });
    }

    const [folders, allLists] = await Promise.all([
      findFoldersBySpaceId(spaceId),
      findListsBySpaceId(spaceId)
    ]);

    const directLists = [];
    const listMap = {};

    allLists.forEach(list => {
      if (list.folder_id) {
        if (!listMap[list.folder_id]) {
          listMap[list.folder_id] = [];
        }
        listMap[list.folder_id].push(list);
      } else {
        directLists.push(list);
      }
    });

    const formattedFolders = folders.map(folder => {
      return {
        ...folder,
        lists: listMap[folder.folder_id] || []
      };
    });

    return res.status(200).json({
      status: "success",
      data: {
        spaceId: space.space_id || space.id,
        name: space.name,
        description: space.description,
        isPrivate: space.is_private || space.isPrivate,
        folders: formattedFolders,
        lists: directLists
      }
    });

  } catch (error) {
    console.error("Error in getSpaceDetails:", error); // Bắt buộc phải log lỗi ra để debug
    return res.status(500).json({ error: "Failed to retrieve space details" });
  }
};



export const getSpaceMembers = async (req, res) => {
  try {
    const { spaceId } = req.params;
    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    const members = await findSpaceMembers(spaceId);
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve space members" });
  }
};

export const inviteMembersToSpace = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { userIds } = req.body;
    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "User IDs are required" });
    }
    for (const userId of userIds) {
      await addSpaceMember(spaceId, userId);
    }
    res.status(200).json({ message: "Members invited to space successfully" });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to invite members to space" });
  }
};

export const removeMemberFromSpace = async (req, res) => {
  try {
    const { spaceId, userId } = req.params;
    if (!spaceId || !userId) {
      return res.status(400).json({ error: "Space ID and User ID are required" });
    }
    const removedMember = await removeSpaceMember(spaceId, userId);
    if (!removedMember) {
      return res.status(404).json({ error: "Member not found in space" });
    }
    res.status(200).json({ message: "Member removed from space successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove member from space" });
  }
};
