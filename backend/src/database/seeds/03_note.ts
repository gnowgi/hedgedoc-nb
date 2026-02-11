/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { NoteType } from '@hedgedoc/commons';
import {
  FieldNameAlias,
  FieldNameAuthorshipInfo,
  FieldNameNote,
  FieldNameNoteGroupPermission,
  FieldNameNoteUserPermission,
  FieldNameRevision,
  FieldNameRevisionTag,
  TableAlias,
  TableAuthorshipInfo,
  TableNote,
  TableNoteGroupPermission,
  TableNoteUserPermission,
  TableRevision,
  TableRevisionTag,
} from '@hedgedoc/database';
import { createPatch } from 'diff';
import { readFileSync } from 'fs';
import { Knex } from 'knex';

import { extractRevisionMetadataFromContent } from '../../revisions/utils/extract-revision-metadata-from-content';
import { dateTimeToDB, getCurrentDateTime } from '../../utils/datetime';

export async function seed(knex: Knex): Promise<void> {
  // Clear tables beforehand
  await knex(TableNote).del();
  await knex(TableAlias).del();
  await knex(TableRevision).del();
  await knex(TableRevisionTag).del();
  await knex(TableAuthorshipInfo).del();
  await knex(TableNoteGroupPermission).del();
  await knex(TableNoteUserPermission).del();

  const guestNoteRevisionUuid = '0196a6e7-9669-7ef3-9c10-520734c61593';
  const userNoteRevisionUuid = '0196a6e8-f63e-7473-bf58-ea97e937fde2';
  const userSlideRevisionUuid = '0196a6e9-1152-7940-a531-01b9527321c0';
  const featuresRevisionUuid = 'a8cd9610-a0ed-42d1-b4f3-c8c46f329cd8';
  const nodeBookRevisionUuid = '4c212d13-22b1-4023-be1f-26ef0b720bbe';

  const guestNoteAlias = 'guest-note';
  const userNoteAlias = 'user-note';
  const userSlideAlias = 'user-slide';
  const featuresAlias = 'features';
  const nodeBookAlias = 'nodeBook';

  const guestNoteContent = readFileSync('./notes/guest_note.md', 'utf-8');
  const userNoteContent = readFileSync('./notes/local_user_note.md', 'utf-8');
  const userSlideContent = readFileSync('./notes/local_user_slide.md', 'utf-8');
  const featuresContent = readFileSync('./notes/features.md', 'utf-8');
  const nodeBookContent = readFileSync('./notes/nodebook_demo.md', 'utf-8');

  const {
    title: guestNoteTitle,
    description: guestNoteDescription,
    tags: guestNoteTags,
  } = extractRevisionMetadataFromContent(guestNoteContent);
  const {
    title: userNoteTitle,
    description: userNoteDescription,
    tags: userNoteTags,
  } = extractRevisionMetadataFromContent(userNoteContent);
  const {
    title: userSlideTitle,
    description: userSlideDescription,
    tags: userSlideTags,
  } = extractRevisionMetadataFromContent(userSlideContent);
  const {
    title: featuresTitle,
    description: featuresDescription,
    tags: featuresTags,
  } = extractRevisionMetadataFromContent(featuresContent);
  const {
    title: nodeBookTitle,
    description: nodeBookDescription,
    tags: nodeBookTags,
  } = extractRevisionMetadataFromContent(nodeBookContent);

  // Insert a few notes and revisions
  await knex(TableNote).insert([
    {
      [FieldNameNote.ownerId]: 1,
      [FieldNameNote.version]: 2,
      [FieldNameNote.createdAt]: dateTimeToDB(getCurrentDateTime()),
      [FieldNameNote.publiclyVisible]: false,
    },
    {
      [FieldNameNote.ownerId]: 2,
      [FieldNameNote.version]: 2,
      [FieldNameNote.createdAt]: dateTimeToDB(getCurrentDateTime()),
      [FieldNameNote.publiclyVisible]: false,
    },
    {
      [FieldNameNote.ownerId]: 2,
      [FieldNameNote.version]: 2,
      [FieldNameNote.createdAt]: dateTimeToDB(getCurrentDateTime()),
      [FieldNameNote.publiclyVisible]: false,
    },
    {
      [FieldNameNote.ownerId]: 1,
      [FieldNameNote.version]: 2,
      [FieldNameNote.createdAt]: dateTimeToDB(getCurrentDateTime()),
      [FieldNameNote.publiclyVisible]: true,
    },
    {
      [FieldNameNote.ownerId]: 1,
      [FieldNameNote.version]: 2,
      [FieldNameNote.createdAt]: dateTimeToDB(getCurrentDateTime()),
      [FieldNameNote.publiclyVisible]: true,
    },
  ]);
  await knex(TableAlias).insert([
    {
      [FieldNameAlias.noteId]: 1,
      [FieldNameAlias.alias]: guestNoteAlias,
      [FieldNameAlias.isPrimary]: true,
    },
    {
      [FieldNameAlias.noteId]: 2,
      [FieldNameAlias.alias]: userNoteAlias,
      [FieldNameAlias.isPrimary]: true,
    },
    {
      [FieldNameAlias.noteId]: 3,
      [FieldNameAlias.alias]: userSlideAlias,
      [FieldNameAlias.isPrimary]: true,
    },
    {
      [FieldNameAlias.noteId]: 4,
      [FieldNameAlias.alias]: featuresAlias,
      [FieldNameAlias.isPrimary]: true,
    },
    {
      [FieldNameAlias.noteId]: 5,
      [FieldNameAlias.alias]: nodeBookAlias,
      [FieldNameAlias.isPrimary]: true,
    },
  ]);
  await knex(TableRevision).insert([
    {
      [FieldNameRevision.uuid]: guestNoteRevisionUuid,
      [FieldNameRevision.noteId]: 1,
      [FieldNameRevision.patch]: createPatch(guestNoteAlias, '', guestNoteContent),
      [FieldNameRevision.content]: guestNoteContent,
      [FieldNameRevision.yjsStateVector]: null,
      [FieldNameRevision.noteType]: NoteType.DOCUMENT,
      [FieldNameRevision.title]: guestNoteTitle,
      [FieldNameRevision.description]: guestNoteDescription,
      [FieldNameRevision.createdAt]: dateTimeToDB(getCurrentDateTime()),
    },
    {
      [FieldNameRevision.uuid]: userNoteRevisionUuid,
      [FieldNameRevision.noteId]: 1,
      [FieldNameRevision.patch]: createPatch(userNoteAlias, '', userNoteContent),
      [FieldNameRevision.content]: userNoteContent,
      [FieldNameRevision.yjsStateVector]: null,
      [FieldNameRevision.noteType]: NoteType.DOCUMENT,
      [FieldNameRevision.title]: userNoteTitle,
      [FieldNameRevision.description]: userNoteDescription,
      [FieldNameRevision.createdAt]: dateTimeToDB(getCurrentDateTime()),
    },
    {
      [FieldNameRevision.uuid]: userSlideRevisionUuid,
      [FieldNameRevision.noteId]: 3,
      [FieldNameRevision.patch]: createPatch(userSlideAlias, '', userSlideContent),
      [FieldNameRevision.content]: userSlideContent,
      [FieldNameRevision.yjsStateVector]: null,
      [FieldNameRevision.noteType]: NoteType.SLIDE,
      [FieldNameRevision.title]: userSlideTitle,
      [FieldNameRevision.description]: userSlideDescription,
      [FieldNameRevision.createdAt]: dateTimeToDB(getCurrentDateTime()),
    },
    {
      [FieldNameRevision.uuid]: featuresRevisionUuid,
      [FieldNameRevision.noteId]: 4,
      [FieldNameRevision.patch]: createPatch(featuresAlias, '', featuresContent),
      [FieldNameRevision.content]: featuresContent,
      [FieldNameRevision.yjsStateVector]: null,
      [FieldNameRevision.noteType]: NoteType.DOCUMENT,
      [FieldNameRevision.title]: featuresTitle,
      [FieldNameRevision.description]: featuresDescription,
      [FieldNameRevision.createdAt]: dateTimeToDB(getCurrentDateTime()),
    },
    {
      [FieldNameRevision.uuid]: nodeBookRevisionUuid,
      [FieldNameRevision.noteId]: 5,
      [FieldNameRevision.patch]: createPatch(nodeBookAlias, '', nodeBookContent),
      [FieldNameRevision.content]: nodeBookContent,
      [FieldNameRevision.yjsStateVector]: null,
      [FieldNameRevision.noteType]: NoteType.DOCUMENT,
      [FieldNameRevision.title]: nodeBookTitle,
      [FieldNameRevision.description]: nodeBookDescription,
      [FieldNameRevision.createdAt]: dateTimeToDB(getCurrentDateTime()),
    },
  ]);
  await knex(TableRevisionTag).insert([
    ...guestNoteTags.map((tag) => ({
      [FieldNameRevisionTag.revisionUuid]: guestNoteRevisionUuid,
      [FieldNameRevisionTag.tag]: tag,
    })),
    ...userNoteTags.map((tag) => ({
      [FieldNameRevisionTag.revisionUuid]: userNoteRevisionUuid,
      [FieldNameRevisionTag.tag]: tag,
    })),
    ...userSlideTags.map((tag) => ({
      [FieldNameRevisionTag.revisionUuid]: userSlideRevisionUuid,
      [FieldNameRevisionTag.tag]: tag,
    })),
    ...featuresTags.map((tag) => ({
      [FieldNameRevisionTag.revisionUuid]: featuresRevisionUuid,
      [FieldNameRevisionTag.tag]: tag,
    })),
    ...nodeBookTags.map((tag) => ({
      [FieldNameRevisionTag.revisionUuid]: nodeBookRevisionUuid,
      [FieldNameRevisionTag.tag]: tag,
    })),
  ]);
  await knex(TableAuthorshipInfo).insert([
    {
      [FieldNameAuthorshipInfo.revisionUuid]: guestNoteRevisionUuid,
      [FieldNameAuthorshipInfo.authorId]: 1,
      [FieldNameAuthorshipInfo.startPosition]: 0,
      [FieldNameAuthorshipInfo.endPosition]: guestNoteContent.length,
      [FieldNameAuthorshipInfo.createdAt]: dateTimeToDB(getCurrentDateTime()),
    },
    {
      [FieldNameAuthorshipInfo.revisionUuid]: userNoteRevisionUuid,
      [FieldNameAuthorshipInfo.authorId]: 2,
      [FieldNameAuthorshipInfo.startPosition]: 0,
      [FieldNameAuthorshipInfo.endPosition]: userNoteContent.length,
      [FieldNameAuthorshipInfo.createdAt]: dateTimeToDB(getCurrentDateTime()),
    },
    {
      [FieldNameAuthorshipInfo.revisionUuid]: userSlideRevisionUuid,
      [FieldNameAuthorshipInfo.authorId]: 2,
      [FieldNameAuthorshipInfo.startPosition]: 0,
      [FieldNameAuthorshipInfo.endPosition]: userSlideContent.length,
      [FieldNameAuthorshipInfo.createdAt]: dateTimeToDB(getCurrentDateTime()),
    },
    {
      [FieldNameAuthorshipInfo.revisionUuid]: featuresRevisionUuid,
      [FieldNameAuthorshipInfo.authorId]: 1,
      [FieldNameAuthorshipInfo.startPosition]: 0,
      [FieldNameAuthorshipInfo.endPosition]: featuresContent.length,
      [FieldNameAuthorshipInfo.createdAt]: dateTimeToDB(getCurrentDateTime()),
    },
    {
      [FieldNameAuthorshipInfo.revisionUuid]: nodeBookRevisionUuid,
      [FieldNameAuthorshipInfo.authorId]: 1,
      [FieldNameAuthorshipInfo.startPosition]: 0,
      [FieldNameAuthorshipInfo.endPosition]: nodeBookContent.length,
      [FieldNameAuthorshipInfo.createdAt]: dateTimeToDB(getCurrentDateTime()),
    },
  ]);
  await knex(TableNoteGroupPermission).insert([
    {
      [FieldNameNoteGroupPermission.noteId]: 1,
      [FieldNameNoteGroupPermission.groupId]: 1,
      [FieldNameNoteGroupPermission.canEdit]: true,
    },
    {
      [FieldNameNoteGroupPermission.noteId]: 2,
      [FieldNameNoteGroupPermission.groupId]: 1,
      [FieldNameNoteGroupPermission.canEdit]: false,
    },
    {
      [FieldNameNoteGroupPermission.noteId]: 3,
      [FieldNameNoteGroupPermission.groupId]: 1,
      [FieldNameNoteGroupPermission.canEdit]: false,
    },
    {
      [FieldNameNoteGroupPermission.noteId]: 4,
      [FieldNameNoteGroupPermission.groupId]: 1,
      [FieldNameNoteGroupPermission.canEdit]: false,
    },
    {
      [FieldNameNoteGroupPermission.noteId]: 5,
      [FieldNameNoteGroupPermission.groupId]: 1,
      [FieldNameNoteGroupPermission.canEdit]: false,
    },
  ]);
  await knex(TableNoteUserPermission).insert([
    {
      [FieldNameNoteUserPermission.noteId]: 2,
      [FieldNameNoteUserPermission.userId]: 2,
      [FieldNameNoteUserPermission.canEdit]: true,
    },
    {
      [FieldNameNoteUserPermission.noteId]: 3,
      [FieldNameNoteUserPermission.userId]: 2,
      [FieldNameNoteUserPermission.canEdit]: true,
    },
  ]);
}
