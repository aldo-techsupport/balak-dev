--
-- PostgreSQL database dump
--

\restrict Tw3FBGXTO5vDw5O0e32Ts8fKzGQnQF7XRpczrfyRNaEaf4We32Hdj919q2NUwHb

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."MatchParticipant" DROP CONSTRAINT IF EXISTS "MatchParticipant_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."MatchParticipant" DROP CONSTRAINT IF EXISTS "MatchParticipant_matchId_fkey";
DROP INDEX IF EXISTS public."User_username_key";
DROP INDEX IF EXISTS public."User_username_idx";
DROP INDEX IF EXISTS public."User_email_key";
DROP INDEX IF EXISTS public."User_email_idx";
DROP INDEX IF EXISTS public."MatchParticipant_userId_idx";
DROP INDEX IF EXISTS public."MatchParticipant_matchId_idx";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."MatchParticipant" DROP CONSTRAINT IF EXISTS "MatchParticipant_pkey";
ALTER TABLE IF EXISTS ONLY public."MatchHistory" DROP CONSTRAINT IF EXISTS "MatchHistory_pkey";
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."MatchParticipant";
DROP TABLE IF EXISTS public."MatchHistory";
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: MatchHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MatchHistory" (
    id text NOT NULL,
    "roomCode" text NOT NULL,
    "gameMode" text NOT NULL,
    "playerCount" integer NOT NULL,
    "winnerId" text,
    "winnerNickname" text,
    "winningTeam" text,
    "endReason" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MatchHistory" OWNER TO postgres;

--
-- Name: MatchParticipant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MatchParticipant" (
    id text NOT NULL,
    "matchId" text NOT NULL,
    "userId" text NOT NULL,
    "userNicknameSnapshot" text NOT NULL,
    "userAvatarSnapshot" text NOT NULL,
    "seatIndex" integer NOT NULL,
    team text,
    rank integer DEFAULT 1 NOT NULL,
    "isWinner" boolean DEFAULT false NOT NULL,
    "remainingPips" integer DEFAULT 0 NOT NULL,
    "remainingTiles" text DEFAULT '[]'::text NOT NULL,
    "rankSnapshot" text DEFAULT 'Warrior III (0★)'::text NOT NULL,
    "rankStarsChange" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."MatchParticipant" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    nickname text NOT NULL,
    avatar text DEFAULT 'avatar_1'::text NOT NULL,
    "totalGames" integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    "soloGames" integer DEFAULT 0 NOT NULL,
    "soloWins" integer DEFAULT 0 NOT NULL,
    "teamGames" integer DEFAULT 0 NOT NULL,
    "teamWins" integer DEFAULT 0 NOT NULL,
    "nicknameLastChanged" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "rankDivision" text DEFAULT 'III'::text NOT NULL,
    "rankScore" integer DEFAULT 0 NOT NULL,
    "rankStars" integer DEFAULT 0 NOT NULL,
    "rankTier" text DEFAULT 'WARRIOR'::text NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Data for Name: MatchHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."MatchHistory" VALUES ('8cf42fec-36e0-4f44-8c40-c97f9d120c31', 'XMG7V4', 'SOLO', 2, 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', NULL, 'DEADLOCK', '2026-10-16 13:40:57.042');
INSERT INTO public."MatchHistory" VALUES ('8fc0dff5-e862-493c-8cef-5426df0986b8', 'ZTXB54', 'SOLO', 2, '1adebb94-a35b-4043-818d-aaa059055239', 'tes', NULL, 'NORMAL_WIN', '2026-10-16 13:54:55.336');
INSERT INTO public."MatchHistory" VALUES ('28e42afe-6c0d-4820-aa34-5582f71a969c', 'KDJNC8', 'SOLO', 2, 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', NULL, 'NORMAL_WIN', '2026-10-16 14:02:41.511');
INSERT INTO public."MatchHistory" VALUES ('1a3c2573-5d91-4440-9584-e7e6a75d9ffd', '5ASCM8', 'SOLO', 2, '1adebb94-a35b-4043-818d-aaa059055239', 'tes', NULL, 'NORMAL_WIN', '2026-10-16 14:14:46.73');
INSERT INTO public."MatchHistory" VALUES ('f02e1b39-69c6-425f-8f19-4c255c3c241e', '8A422L', 'SOLO', 2, '73ce00a3-b731-4b12-884d-6c2235e66045', 'Tenzo', NULL, 'NORMAL_WIN', '2026-10-16 14:36:15.861');
INSERT INTO public."MatchHistory" VALUES ('31d4127a-c02a-4f29-be89-812b312173f1', 'Y6XPSE', 'TEAM_BATTLE', 4, '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'TEAM_A', 'NORMAL_WIN', '2026-10-16 16:53:43.619');
INSERT INTO public."MatchHistory" VALUES ('e27d545e-282e-432a-920a-fecb15d005ff', 'JDH34P', 'TEAM_BATTLE', 4, '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', 'TEAM_B', 'NORMAL_WIN', '2026-10-16 16:57:01.663');
INSERT INTO public."MatchHistory" VALUES ('8ff19e26-5171-4da0-b026-80803b33c875', '6UM3KZ', 'SOLO', 2, '0968af63-2efc-4647-892f-dd797cb005fe', 'user1', NULL, 'DEADLOCK', '2026-10-16 17:06:38.567');
INSERT INTO public."MatchHistory" VALUES ('c82611ab-dbdc-466d-aa0e-185e285d60ef', 'RDRLLJ', 'SOLO', 2, '1adebb94-a35b-4043-818d-aaa059055239', 'tes', NULL, 'NORMAL_WIN', '2026-10-16 17:15:31.666');
INSERT INTO public."MatchHistory" VALUES ('d16ff1a5-a130-4288-b017-a7d930d5abdb', 'AFXQ4K', 'TEAM_BATTLE', 4, 'b494bb11-bf26-4b5a-bf71-a4d75bf854b5', 'Adi', 'TEAM_B', 'NORMAL_WIN', '2026-10-16 17:18:20.089');
INSERT INTO public."MatchHistory" VALUES ('a328b573-c84a-4148-a7a8-cbbd9f16366d', 'GLWJSV', 'SOLO', 2, '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', NULL, 'NORMAL_WIN', '2026-10-16 17:44:40.637');
INSERT INTO public."MatchHistory" VALUES ('f56d0f13-a721-4a00-a508-7ec24750a7c6', 'QDSVPU', 'TEAM_BATTLE', 4, NULL, 'Tim Biru (Tim B)', 'TEAM_B', 'DEADLOCK', '2026-10-16 17:48:54.313');
INSERT INTO public."MatchHistory" VALUES ('ff300c37-0a44-4d04-9ccd-bcd252dde7a9', 'AZ6GAB', 'TEAM_BATTLE', 4, 'b494bb11-bf26-4b5a-bf71-a4d75bf854b5', 'Adi', 'TEAM_B', 'NORMAL_WIN', '2026-10-16 17:52:22.015');
INSERT INTO public."MatchHistory" VALUES ('ceb435b0-ea05-4ebc-8911-c9a24cae99ca', '24FAWJ', 'SOLO', 4, '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', NULL, 'NORMAL_WIN', '2026-10-16 17:55:56.807');
INSERT INTO public."MatchHistory" VALUES ('f67a4f76-acf4-4c16-9c72-f0f284aca53c', '6LN58A', 'SOLO', 2, '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', NULL, 'NORMAL_WIN', '2026-10-17 01:15:31.455');
INSERT INTO public."MatchHistory" VALUES ('039172c3-9d16-40a3-b90e-13b1f4c20b88', '6LN58A', 'SOLO', 2, '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', NULL, 'NORMAL_WIN', '2026-10-17 01:16:50.312');
INSERT INTO public."MatchHistory" VALUES ('bb874c49-6130-4ca7-87c0-29f100e3bcf2', '6LN58A', 'SOLO', 2, '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', NULL, 'NORMAL_WIN', '2026-10-17 01:18:46.647');
INSERT INTO public."MatchHistory" VALUES ('5acd63e6-0977-4703-b9d3-236d1f1b73f7', 'Z3UDSK', 'SOLO', 2, 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', NULL, 'NORMAL_WIN', '2026-10-17 05:05:55.498');
INSERT INTO public."MatchHistory" VALUES ('2eac5c47-5f64-48ec-8d4b-701c35bbb769', 'Z3UDSK', 'SOLO', 2, 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', NULL, 'NORMAL_WIN', '2026-10-17 05:06:43.032');
INSERT INTO public."MatchHistory" VALUES ('6a7f9f71-ccdf-4fd3-b484-7722f1a57a05', 'Z3UDSK', 'SOLO', 2, 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', NULL, 'DEADLOCK', '2026-10-17 05:07:43.441');
INSERT INTO public."MatchHistory" VALUES ('b0e656da-00fc-4eab-864d-eb3610612fa1', 'Z3UDSK', 'SOLO', 2, '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', NULL, 'NORMAL_WIN', '2026-10-17 05:08:48.248');
INSERT INTO public."MatchHistory" VALUES ('7c9f4f41-b64b-48ae-8c46-ae7497a43d5b', 'Z3UDSK', 'SOLO', 2, 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', NULL, 'NORMAL_WIN', '2026-10-17 05:09:32.198');
INSERT INTO public."MatchHistory" VALUES ('32024ce8-5fd4-4e09-b312-f71d2e22b16e', 'Z3UDSK', 'SOLO', 2, 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', NULL, 'DEADLOCK', '2026-10-17 05:11:00.245');


--
-- Data for Name: MatchParticipant; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."MatchParticipant" VALUES ('6e16533c-bb25-4aae-b178-00ba9f01c25e', '8cf42fec-36e0-4f44-8c40-c97f9d120c31', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_1', 0, NULL, 1, false, 17, '[{"id":"4-4","left":4,"right":4},{"id":"1-4","left":1,"right":4},{"id":"2-2","left":2,"right":2}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('7e22879d-777c-4218-8f09-4619e42b11d3', '8cf42fec-36e0-4f44-8c40-c97f9d120c31', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 1, NULL, 1, true, 14, '[{"id":"1-3","left":1,"right":3},{"id":"4-6","left":4,"right":6}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('fb8aaa1d-f8be-4314-aa21-17fa1aa5245d', '8fc0dff5-e862-493c-8cef-5426df0986b8', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, NULL, 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('c058c307-2d62-4f94-b339-e89221ba6ea7', '8fc0dff5-e862-493c-8cef-5426df0986b8', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 1, NULL, 1, false, 20, '[{"id":"4-4","left":4,"right":4},{"id":"2-3","left":2,"right":3},{"id":"2-5","left":2,"right":5}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('93a40ff1-67a1-4e3c-83fa-40695914f91a', '28e42afe-6c0d-4820-aa34-5582f71a969c', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, NULL, 1, false, 16, '[{"id":"4-4","left":4,"right":4},{"id":"2-6","left":2,"right":6}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('25596c79-5978-40fb-b1c5-899a9ff75807', '28e42afe-6c0d-4820-aa34-5582f71a969c', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 1, NULL, 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('e0407e09-9d09-471c-95b5-fc8dea7fb1db', '1a3c2573-5d91-4440-9584-e7e6a75d9ffd', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, NULL, 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('6f786d6f-d9e3-4754-8a60-ea13496c7ee3', '1a3c2573-5d91-4440-9584-e7e6a75d9ffd', '0968af63-2efc-4647-892f-dd797cb005fe', 'user1', 'avatar_1', 1, NULL, 1, false, 6, '[{"id":"3-3","left":3,"right":3}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('786aff20-815a-4eac-8ab2-4288eb1a1e5c', 'f02e1b39-69c6-425f-8f19-4c255c3c241e', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, NULL, 1, false, 15, '[{"id":"3-4","left":3,"right":4},{"id":"4-4","left":4,"right":4}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('d3c7e930-40ea-45f6-b6cd-59910ec067dd', 'f02e1b39-69c6-425f-8f19-4c255c3c241e', '73ce00a3-b731-4b12-884d-6c2235e66045', 'Tenzo', 'avatar_1', 1, NULL, 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('bd436cfc-3072-46fb-8e18-2d53ddd4b178', '31d4127a-c02a-4f29-be89-812b312173f1', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, 'TEAM_A', 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('89625aa7-1834-4145-91d5-a2d19c7a454a', '31d4127a-c02a-4f29-be89-812b312173f1', '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', 'avatar_1', 1, 'TEAM_B', 1, false, 4, '[{"id":"0-4","left":0,"right":4}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('bcedf746-4e7e-4b62-bb81-8965d4075bce', '31d4127a-c02a-4f29-be89-812b312173f1', '73ce00a3-b731-4b12-884d-6c2235e66045', 'Tenzo', 'avatar_1', 2, 'TEAM_A', 1, true, 10, '[{"id":"4-4","left":4,"right":4},{"id":"0-2","left":0,"right":2}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('c9e7e4ca-c6b7-4988-a1fc-845b7c5bfa2f', '31d4127a-c02a-4f29-be89-812b312173f1', 'b494bb11-bf26-4b5a-bf71-a4d75bf854b5', 'Adi', 'avatar_1', 3, 'TEAM_B', 1, false, 0, '[{"id":"0-0","left":0,"right":0}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('1d3abe4c-b54b-4b9f-ba36-60089d973725', 'e27d545e-282e-432a-920a-fecb15d005ff', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, 'TEAM_A', 1, false, 6, '[{"id":"0-0","left":0,"right":0},{"id":"3-3","left":3,"right":3}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('8c8d6344-0776-4793-9d5c-4c1802dfa261', 'e27d545e-282e-432a-920a-fecb15d005ff', '73ce00a3-b731-4b12-884d-6c2235e66045', 'Tenzo', 'avatar_1', 1, 'TEAM_B', 1, true, 11, '[{"id":"1-1","left":1,"right":1},{"id":"4-5","left":4,"right":5}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('41ed1323-5ab8-4bf5-b1f7-a7167be07d96', 'e27d545e-282e-432a-920a-fecb15d005ff', 'b494bb11-bf26-4b5a-bf71-a4d75bf854b5', 'Adi', 'avatar_1', 2, 'TEAM_A', 1, false, 9, '[{"id":"0-5","left":0,"right":5},{"id":"0-4","left":0,"right":4}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('3aadba14-84b7-42c6-84ae-dcc15c4ece85', 'e27d545e-282e-432a-920a-fecb15d005ff', '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', 'avatar_1', 3, 'TEAM_B', 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('4ce36a74-1411-455c-87a0-f32a5c9f253c', '8ff19e26-5171-4da0-b026-80803b33c875', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, NULL, 1, false, 33, '[{"id":"1-1","left":1,"right":1},{"id":"1-5","left":1,"right":5},{"id":"5-5","left":5,"right":5},{"id":"3-3","left":3,"right":3},{"id":"1-3","left":1,"right":3},{"id":"2-3","left":2,"right":3}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('86f21ad7-4491-4a40-9f6f-baf404f2a310', '8ff19e26-5171-4da0-b026-80803b33c875', '0968af63-2efc-4647-892f-dd797cb005fe', 'user1', 'avatar_1', 1, NULL, 1, true, 25, '[{"id":"0-5","left":0,"right":5},{"id":"0-3","left":0,"right":3},{"id":"2-4","left":2,"right":4},{"id":"1-2","left":1,"right":2},{"id":"0-4","left":0,"right":4},{"id":"2-2","left":2,"right":2}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('99ffb0a9-379c-4e97-91bf-0c7d31b33dd0', 'c82611ab-dbdc-466d-aa0e-185e285d60ef', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, NULL, 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('6512dee5-ad8d-4d29-887c-618ec160ed94', 'c82611ab-dbdc-466d-aa0e-185e285d60ef', '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', 'avatar_1', 1, NULL, 1, false, 14, '[{"id":"1-3","left":1,"right":3},{"id":"5-5","left":5,"right":5}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('1e5b05d7-e77a-400d-98f1-a74d5d554027', 'd16ff1a5-a130-4288-b017-a7d930d5abdb', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, 'TEAM_A', 1, false, 2, '[{"id":"0-2","left":0,"right":2}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('1e1cdf16-0ee6-483a-9602-ca71a70b1c6e', 'd16ff1a5-a130-4288-b017-a7d930d5abdb', '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', 'avatar_1', 1, 'TEAM_B', 1, true, 0, '[{"id":"0-0","left":0,"right":0}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('8fa84fda-e1cd-409d-b07f-2121a5f144ab', 'd16ff1a5-a130-4288-b017-a7d930d5abdb', '73ce00a3-b731-4b12-884d-6c2235e66045', 'Tenzo', 'avatar_1', 2, 'TEAM_A', 1, false, 3, '[{"id":"1-2","left":1,"right":2}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('b63f5826-570a-4806-ad96-de519e1fea81', 'd16ff1a5-a130-4288-b017-a7d930d5abdb', 'b494bb11-bf26-4b5a-bf71-a4d75bf854b5', 'Adi', 'avatar_1', 3, 'TEAM_B', 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('5365cb77-4407-4c76-b311-4636dbcb5294', 'a328b573-c84a-4148-a7a8-cbbd9f16366d', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, NULL, 1, false, 5, '[{"id":"0-1","left":0,"right":1},{"id":"1-3","left":1,"right":3}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('692f2282-da80-46a8-b699-bf13098b1b27', 'a328b573-c84a-4148-a7a8-cbbd9f16366d', '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', 'avatar_1', 1, NULL, 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('c7ec5512-bbc7-4efb-97de-506b5ae8bf98', 'f56d0f13-a721-4a00-a508-7ec24750a7c6', '1adebb94-a35b-4043-818d-aaa059055239', 'tes', 'avatar_3', 0, 'TEAM_A', 1, false, 5, '[{"id":"1-2","left":1,"right":2},{"id":"1-1","left":1,"right":1}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('1cf41cb4-a017-4437-a7bd-c21005a93854', 'f56d0f13-a721-4a00-a508-7ec24750a7c6', '73ce00a3-b731-4b12-884d-6c2235e66045', 'Tenzo', 'avatar_1', 1, 'TEAM_B', 1, true, 1, '[{"id":"0-1","left":0,"right":1}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('4b29fe40-1616-46dd-b9f5-e9de6206cc39', 'f56d0f13-a721-4a00-a508-7ec24750a7c6', 'b494bb11-bf26-4b5a-bf71-a4d75bf854b5', 'Adi', 'avatar_1', 2, 'TEAM_A', 1, false, 4, '[{"id":"0-0","left":0,"right":0},{"id":"2-2","left":2,"right":2}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('ec228998-3011-4e35-bdb9-ddb26d745a8e', 'f56d0f13-a721-4a00-a508-7ec24750a7c6', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 3, 'TEAM_B', 1, true, 2, '[{"id":"0-2","left":0,"right":2}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('4bc77045-16c1-4d54-a744-2daff1562116', 'ff300c37-0a44-4d04-9ccd-bcd252dde7a9', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, 'TEAM_A', 1, false, 12, '[{"id":"1-5","left":1,"right":5},{"id":"3-3","left":3,"right":3}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('e5998acf-550b-4366-8ff1-fc823eceef4b', 'ff300c37-0a44-4d04-9ccd-bcd252dde7a9', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 1, 'TEAM_B', 1, true, 8, '[{"id":"3-5","left":3,"right":5}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('65a20415-8e30-4c85-92d2-cdd7078e2276', 'ff300c37-0a44-4d04-9ccd-bcd252dde7a9', '73ce00a3-b731-4b12-884d-6c2235e66045', 'Tenzo', 'avatar_1', 2, 'TEAM_A', 1, false, 5, '[{"id":"2-3","left":2,"right":3}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('be3f7bc3-b354-4fba-bb92-9868f7bd556d', 'ff300c37-0a44-4d04-9ccd-bcd252dde7a9', 'b494bb11-bf26-4b5a-bf71-a4d75bf854b5', 'Adi', 'avatar_1', 3, 'TEAM_B', 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('94310be5-8f97-44e9-a9b7-9b965fb0e542', 'ceb435b0-ea05-4ebc-8911-c9a24cae99ca', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, NULL, 1, true, 0, '[]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('46ecb8e7-6d4b-4c56-86d8-1360a998a387', 'ceb435b0-ea05-4ebc-8911-c9a24cae99ca', 'b494bb11-bf26-4b5a-bf71-a4d75bf854b5', 'Adi', 'avatar_1', 1, NULL, 1, false, 3, '[{"id":"0-3","left":0,"right":3}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('e6453b5b-067e-4fb6-8420-7b12c8a928c3', 'ceb435b0-ea05-4ebc-8911-c9a24cae99ca', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 2, NULL, 1, false, 5, '[{"id":"0-5","left":0,"right":5}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('105a4f59-07c5-4921-85e5-05e831499346', 'ceb435b0-ea05-4ebc-8911-c9a24cae99ca', '73ce00a3-b731-4b12-884d-6c2235e66045', 'Tenzo', 'avatar_1', 3, NULL, 1, false, 4, '[{"id":"2-2","left":2,"right":2}]', 'Warrior III (0★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('6898749b-36fe-44fe-a8b2-729e82dfb60d', 'f67a4f76-acf4-4c16-9c72-f0f284aca53c', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, NULL, 1, false, 34, '[{"id":"3-5","left":3,"right":5},{"id":"3-6","left":3,"right":6},{"id":"4-6","left":4,"right":6},{"id":"3-4","left":3,"right":4}]', 'Warrior III (0/3★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('05a6b5f1-c205-4314-9c76-96c48a8841e6', 'f67a4f76-acf4-4c16-9c72-f0f284aca53c', '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', 'avatar_1', 1, NULL, 1, true, 0, '[]', 'Warrior III (1/3★)', 1);
INSERT INTO public."MatchParticipant" VALUES ('dd54f0a8-0451-431d-8586-51fd73a3d55d', '039172c3-9d16-40a3-b90e-13b1f4c20b88', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, NULL, 1, true, 0, '[]', 'Warrior III (1/3★)', 1);
INSERT INTO public."MatchParticipant" VALUES ('2c104df2-3b90-4cde-a362-61442037f9d9', '039172c3-9d16-40a3-b90e-13b1f4c20b88', '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', 'avatar_1', 1, NULL, 1, false, 11, '[{"id":"0-0","left":0,"right":0},{"id":"5-6","left":5,"right":6}]', 'Warrior III (1/3★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('57ac5996-5a91-4acc-81ab-863ed5e9ba19', 'bb874c49-6130-4ca7-87c0-29f100e3bcf2', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, NULL, 1, true, 0, '[]', 'Warrior III (2/3★)', 1);
INSERT INTO public."MatchParticipant" VALUES ('389d70b9-b851-48db-ac3f-03bcf0720c4c', 'bb874c49-6130-4ca7-87c0-29f100e3bcf2', '7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'Owner', 'avatar_1', 1, NULL, 1, false, 4, '[{"id":"2-2","left":2,"right":2}]', 'Warrior III (1/3★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('598dfbdc-d5eb-401d-a638-cb6bbba517c7', '5acd63e6-0977-4703-b9d3-236d1f1b73f7', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, NULL, 1, false, 6, '[{"id":"3-3","left":3,"right":3}]', 'Warrior III (1/3★)', -1);
INSERT INTO public."MatchParticipant" VALUES ('fabbb8ce-8075-4eb8-a949-ea4c1eddaa02', '5acd63e6-0977-4703-b9d3-236d1f1b73f7', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 1, NULL, 1, true, 0, '[]', 'Warrior III (1/3★)', 1);
INSERT INTO public."MatchParticipant" VALUES ('e456a54c-7418-4fab-9da5-9866039bdfef', '2eac5c47-5f64-48ec-8d4b-701c35bbb769', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, NULL, 1, false, 16, '[{"id":"5-5","left":5,"right":5},{"id":"0-2","left":0,"right":2},{"id":"0-4","left":0,"right":4}]', 'Warrior III (0/3★)', -1);
INSERT INTO public."MatchParticipant" VALUES ('8eac9647-dc5f-48e6-a5b1-7fee09343320', '2eac5c47-5f64-48ec-8d4b-701c35bbb769', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 1, NULL, 1, true, 0, '[]', 'Warrior III (2/3★)', 1);
INSERT INTO public."MatchParticipant" VALUES ('ec36c567-f7a6-4d58-b309-66e35b4797af', '6a7f9f71-ccdf-4fd3-b484-7722f1a57a05', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, NULL, 1, false, 12, '[{"id":"1-2","left":1,"right":2},{"id":"2-2","left":2,"right":2},{"id":"1-4","left":1,"right":4}]', 'Warrior III (0/3★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('ed08ea0d-aba9-4822-9c11-8810e80f709f', '6a7f9f71-ccdf-4fd3-b484-7722f1a57a05', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 1, NULL, 1, true, 9, '[{"id":"0-1","left":0,"right":1},{"id":"0-2","left":0,"right":2},{"id":"1-1","left":1,"right":1},{"id":"0-4","left":0,"right":4}]', 'Warrior II (0/3★)', 1);
INSERT INTO public."MatchParticipant" VALUES ('ac5ecdeb-0162-4690-9944-5600da76714d', 'b0e656da-00fc-4eab-864d-eb3610612fa1', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, NULL, 1, true, 0, '[]', 'Warrior III (1/3★)', 1);
INSERT INTO public."MatchParticipant" VALUES ('93997421-02f5-4484-b7cc-8ed0f3ba0bce', 'b0e656da-00fc-4eab-864d-eb3610612fa1', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 1, NULL, 1, false, 3, '[{"id":"0-3","left":0,"right":3}]', 'Warrior III (2/3★)', -1);
INSERT INTO public."MatchParticipant" VALUES ('87458f54-8120-4a9a-82a7-d7b4fc074b10', '7c9f4f41-b64b-48ae-8c46-ae7497a43d5b', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, NULL, 1, false, 39, '[{"id":"2-3","left":2,"right":3},{"id":"3-5","left":3,"right":5},{"id":"3-4","left":3,"right":4},{"id":"2-4","left":2,"right":4},{"id":"2-5","left":2,"right":5},{"id":"1-5","left":1,"right":5}]', 'Warrior III (0/3★)', -1);
INSERT INTO public."MatchParticipant" VALUES ('afe45705-56cf-48f1-8d12-617c30ecade2', '7c9f4f41-b64b-48ae-8c46-ae7497a43d5b', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 1, NULL, 1, true, 0, '[]', 'Warrior II (0/3★)', 1);
INSERT INTO public."MatchParticipant" VALUES ('fa99aa91-db02-4757-96de-c63dc1165c2f', '32024ce8-5fd4-4e09-b312-f71d2e22b16e', '1adebb94-a35b-4043-818d-aaa059055239', 'BuwungPuyuh', 'avatar_3', 0, NULL, 1, false, 16, '[{"id":"0-3","left":0,"right":3},{"id":"0-2","left":0,"right":2},{"id":"5-5","left":5,"right":5},{"id":"0-1","left":0,"right":1}]', 'Warrior III (0/3★)', 0);
INSERT INTO public."MatchParticipant" VALUES ('2f472185-7672-486b-ac1e-21872a87ef83', '32024ce8-5fd4-4e09-b312-f71d2e22b16e', 'f1f83697-4f91-4f46-80fe-f295130cdf8a', 'Calyrex', 'avatar_1', 1, NULL, 1, true, 12, '[{"id":"1-3","left":1,"right":3},{"id":"3-5","left":3,"right":5}]', 'Warrior II (1/3★)', 1);


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."User" VALUES ('1adebb94-a35b-4043-818d-aaa059055239', 'alrelkurnia', 'admin@admin.com', '$2a$10$QVdviCp6yFN79YGtzM5HO.XF5u1Cqx8ZIBdfD5mDAIjNNNjKSEz76', 'BuwungPuyuh', 'avatar_3', 23, 8, 15, 18, 7, 5, 1, '2026-10-16 17:49:43.953', '2026-10-16 13:26:04.951', '2026-10-17 05:11:00.245', 'III', 3, 0, 'WARRIOR');
INSERT INTO public."User" VALUES ('f1f83697-4f91-4f46-80fe-f295130cdf8a', 'abc123', 'ppq@gmail.com', '$2a$10$cjEr9ceaf2/./anR8e8OQuCnjLAdJXv7.AjOzSFkOsNObTmB6nZ2i', 'Calyrex', 'avatar_1', 12, 9, 3, 10, 7, 2, 2, NULL, '2026-10-16 13:36:25.485', '2026-10-17 05:11:00.245', 'II', 5, 1, 'WARRIOR');
INSERT INTO public."User" VALUES ('b494bb11-bf26-4b5a-bf71-a4d75bf854b5', 'adi', 'yandex@gmail.com', '$2a$10$v5MxFQ/HUPPxuZRk./t2FuTrw1nkM.cDmx/TJH./iB7k.B2Nh2lsS', 'Adi', 'avatar_1', 6, 2, 4, 1, 0, 5, 2, NULL, '2026-10-16 16:50:44.129', '2026-10-16 17:55:56.807', 'III', 0, 0, 'WARRIOR');
INSERT INTO public."User" VALUES ('73ce00a3-b731-4b12-884d-6c2235e66045', 'tenzo', 'doni@gmail.com', '$2a$10$PvbQvYZl0yxPJeH0w.33uONWY.cclPhx88gepZo1wnjiwWYRUG0yu', 'Tenzo', 'avatar_1', 7, 4, 3, 2, 1, 5, 3, NULL, '2026-10-16 14:34:39.074', '2026-10-16 17:55:56.807', 'III', 0, 0, 'WARRIOR');
INSERT INTO public."User" VALUES ('7c6cfaaf-e121-480e-b94c-1a822b8437b6', 'ppq12', 'ppq1@gmail.com', '$2a$10$u/dWVW9QNJ26XpucPEoKOOPOzVNuzTtE7LVMwM7XhqWJbpwBQYW1G', 'Owner', 'avatar_1', 8, 4, 4, 5, 2, 3, 2, NULL, '2026-10-16 14:11:08.717', '2026-10-17 01:18:46.647', 'III', 1, 1, 'WARRIOR');
INSERT INTO public."User" VALUES ('207916b7-16a7-4add-afcc-36fcffb80928', 'budi_master', 'budi@gaple.test', '$2a$10$zsyOff.BBDIazWchXOm5DugkKh8SvESeM5Sc55x9YZk7Oio02XN52', 'Budi Si Balak 6', 'avatar_2', 0, 0, 0, 0, 0, 0, 0, '2026-10-17 01:20:34.657', '2026-10-16 13:10:57.795', '2026-10-17 01:20:34.658', 'III', 0, 0, 'WARRIOR');
INSERT INTO public."User" VALUES ('3c07eed5-2ea6-41c6-b3d9-4e4f66844fff', 'siti_gaple', 'siti@gaple.test', '$2a$10$RmhXA59eJFqtTpX6xJFvwulR9qaUfOZh132kJ7EWxu222XMXKyvF2', 'Siti Ratu Ceki', 'avatar_2', 0, 0, 0, 0, 0, 0, 0, '2026-10-17 01:20:38.124', '2026-10-16 13:10:57.961', '2026-10-17 01:20:38.125', 'III', 0, 0, 'WARRIOR');
INSERT INTO public."User" VALUES ('0968af63-2efc-4647-892f-dd797cb005fe', 'user1', 'user@user.com', '$2a$10$oBnZdCZ1UgGJV40TDgpc3u.Ut9TRCh3zi1fcDSllZucYKWBZl/Hyu', 'user1', 'avatar_1', 2, 1, 1, 2, 1, 0, 0, NULL, '2026-10-16 14:09:05.01', '2026-10-16 17:06:38.567', 'III', 0, 0, 'WARRIOR');
INSERT INTO public."User" VALUES ('aef0c67a-6435-485e-b82e-78198c34118d', 'joko_balak', 'joko@gaple.test', '$2a$10$GCCqHvwFd75BeZZx5RiXBO5mDRY5kDngizzBXk52TevL7nNO6VL2i', 'Joko Juragan Domino', 'avatar_2', 0, 0, 0, 0, 0, 0, 0, '2026-10-17 01:20:38.341', '2026-10-16 13:10:58.091', '2026-10-17 01:20:38.342', 'III', 0, 0, 'WARRIOR');
INSERT INTO public."User" VALUES ('53e60b48-2bf2-477f-8842-792246049cd1', 'ratu_ceki', 'ratu@gaple.test', '$2a$10$opr2JY.cnXCXhgjFXOaAzuUv/vxLguWzU2W147uhCKP8KHuHlxg.u', 'Ratu Kartu Gaple', 'avatar_2', 0, 0, 0, 0, 0, 0, 0, '2026-10-17 01:20:41.85', '2026-10-16 13:10:58.244', '2026-10-17 01:20:41.851', 'III', 0, 0, 'WARRIOR');


--
-- Name: MatchHistory MatchHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MatchHistory"
    ADD CONSTRAINT "MatchHistory_pkey" PRIMARY KEY (id);


--
-- Name: MatchParticipant MatchParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MatchParticipant"
    ADD CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: MatchParticipant_matchId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MatchParticipant_matchId_idx" ON public."MatchParticipant" USING btree ("matchId");


--
-- Name: MatchParticipant_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MatchParticipant_userId_idx" ON public."MatchParticipant" USING btree ("userId");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_username_idx" ON public."User" USING btree (username);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: MatchParticipant MatchParticipant_matchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MatchParticipant"
    ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES public."MatchHistory"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MatchParticipant MatchParticipant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MatchParticipant"
    ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Tw3FBGXTO5vDw5O0e32Ts8fKzGQnQF7XRpczrfyRNaEaf4We32Hdj919q2NUwHb

