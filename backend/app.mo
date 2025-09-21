import AccessControl "authorization/access-control";
import Registry "blob-storage/registry";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import InviteLinksModule "invitelinks/invitelinksmodule";
import Random "mo:base/Random";
import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";
import Array "mo:base/Array";
import Map "mo:base/OrderedMap";
import UserApproval "user-approval/approval";
import Set "mo:base/OrderedSet";

persistent actor {
    let accessControlState = AccessControl.initState();
    let approvalState = UserApproval.initState(accessControlState);

    public shared ({ caller }) func initializeAccessControl() : async () {
        AccessControl.initialize(accessControlState, caller);
    };

    public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
        AccessControl.getUserRole(accessControlState, caller);
    };

    public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
        if (not (AccessControl.isAdmin(accessControlState, caller))) {
            Debug.trap("Unauthorized: Only admins can assign roles");
        };
        AccessControl.assignRole(accessControlState, caller, user, role);
    };

    public query ({ caller }) func isCallerAdmin() : async Bool {
        AccessControl.isAdmin(accessControlState, caller);
    };

    public query ({ caller }) func isCallerApproved() : async Bool {
        AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
    };

    public shared ({ caller }) func requestApproval() : async () {
        UserApproval.requestApproval(approvalState, caller);
    };

    public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Debug.trap("Unauthorized: Only admins can perform this action");
        };
        UserApproval.setApproval(approvalState, user, status);
    };

    public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Debug.trap("Unauthorized: Only admins can perform this action");
        };
        UserApproval.listApprovals(approvalState);
    };

    public type UserProfile = {
        name : Text;
        profilePicture : ?Text;
        isProfileComplete : Bool;
    };

    transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
    var userProfiles = principalMap.empty<UserProfile>();

    public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
        principalMap.get(userProfiles, caller);
    };

    public query func getUserProfile(user : Principal) : async ?UserProfile {
        principalMap.get(userProfiles, user);
    };

    public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
        userProfiles := principalMap.put(userProfiles, caller, profile);
    };

    let registry = Registry.new();

    public func registerFileReference(path : Text, hash : Text) : async () {
        Registry.add(registry, path, hash);
    };

    public query func getFileReference(path : Text) : async Registry.FileReference {
        Registry.get(registry, path);
    };

    public query func listFileReferences() : async [Registry.FileReference] {
        Registry.list(registry);
    };

    public func dropFileReference(path : Text) : async () {
        Registry.remove(registry, path);
    };

    public type Club = {
        id : Nat;
        name : Text;
        description : Text;
        location : Text;
        creator : Principal;
        logo : ?Text;
    };

    transient let natMap = OrderedMap.Make<Nat>(Nat.compare);
    var clubs = natMap.empty<Club>();
    var nextClubId : Nat = 1;

    func ensureUser(caller : Principal) {
        switch (principalMap.get(userProfiles, caller)) {
            case null {
                userProfiles := principalMap.put(
                    userProfiles,
                    caller,
                    {
                        name = "Default Name";
                        profilePicture = null;
                        isProfileComplete = false;
                    },
                );
            };
            case (?_profile) {};
        };
    };

    func hasClubAdminRole(user : Principal, clubId : Nat) : Bool {
        let memberships = Iter.toArray(
            Iter.filter(
                natMap.vals(clubMemberships),
                func(membership : ClubMembership) : Bool {
                    membership.clubId == clubId and Array.find<ClubRole>(membership.roles, func(role : ClubRole) : Bool { role == #clubAdmin }) != null
                },
            )
        );

        Array.find<ClubMembership>(memberships, func(membership : ClubMembership) : Bool { membership.user == user }) != null;
    };

    // Updated createClub function - REMOVED all admin permission checks
    public shared ({ caller }) func createClub(name : Text, description : Text, location : Text) : async Club {
        // Ensure user is registered (but no admin permission check)
        ensureUser(caller);

        // Create the club - any authenticated user can create clubs
        let club : Club = {
            id = nextClubId;
            name;
            description;
            location;
            creator = caller;
            logo = null;
        };

        clubs := natMap.put(clubs, nextClubId, club);
        nextClubId += 1;

        // Automatically assign creator as club admin
        let clubMembership : ClubMembership = {
            user = caller;
            clubId = club.id;
            roles = [#clubAdmin];
        };

        clubMemberships := natMap.put(clubMemberships, nextMembershipId, clubMembership);
        nextMembershipId += 1;

        club;
    };

    public query func getAllClubs() : async [Club] {
        Iter.toArray(natMap.vals(clubs));
    };

    public query func getClubById(id : Nat) : async ?Club {
        natMap.get(clubs, id);
    };

    public shared ({ caller }) func deleteClub(clubId : Nat) : async Bool {
        ensureUser(caller);

        switch (natMap.get(clubs, clubId)) {
            case null {
                Debug.trap("Club not found");
            };
            case (?club) {
                if (not (hasClubAdminRole(caller, clubId) or AccessControl.hasPermission(accessControlState, caller, #admin))) {
                    Debug.trap("Unauthorized: Only club admins or app admins can delete clubs");
                };

                let teamsToDelete = Iter.toArray(
                    Iter.filter(
                        natMap.entries(teams),
                        func((_, team) : (Nat, Team)) : Bool {
                            team.clubId == clubId;
                        },
                    )
                );

                for ((teamId, _) in teamsToDelete.vals()) {
                    ignore await deleteTeam(caller, teamId);
                };

                clubs := natMap.delete(clubs, clubId);
                true;
            };
        };
    };

    public type Team = {
        id : Nat;
        name : Text;
        description : Text;
        clubId : Nat;
        creator : Principal;
    };

    var teams = natMap.empty<Team>();
    var nextTeamId : Nat = 1;

    func hasTeamAdminRole(user : Principal, teamId : Nat) : Bool {
        let memberships = Iter.toArray(
            Iter.filter(
                natMap.vals(teamMemberships),
                func(membership : TeamMembership) : Bool {
                    membership.teamId == teamId and Array.find<TeamRole>(membership.roles, func(role : TeamRole) : Bool { role == #teamAdmin }) != null
                },
            )
        );

        Array.find<TeamMembership>(memberships, func(membership : TeamMembership) : Bool { membership.user == user }) != null;
    };

    public shared ({ caller }) func createTeam(name : Text, description : Text, clubId : Nat) : async Team {
        ensureUser(caller);

        switch (natMap.get(clubs, clubId)) {
            case null {
                Debug.trap("Club not found");
            };
            case (?_club) {};
        };

        let team : Team = {
            id = nextTeamId;
            name;
            description;
            clubId;
            creator = caller;
        };

        teams := natMap.put(teams, nextTeamId, team);
        nextTeamId += 1;

        // Add creator as team admin
        let teamMembership : TeamMembership = {
            user = caller;
            teamId = team.id;
            roles = [#teamAdmin];
        };

        teamMemberships := natMap.put(teamMemberships, nextTeamMembershipId, teamMembership);
        nextTeamMembershipId += 1;

        team;
    };

    public query func getAllTeams() : async [Team] {
        Iter.toArray(natMap.vals(teams));
    };

    public query func getTeamById(id : Nat) : async ?Team {
        natMap.get(teams, id);
    };

    public query func getTeamsByClubId(clubId : Nat) : async [Team] {
        let filtered = Iter.filter(natMap.vals(teams), func(team : Team) : Bool { team.clubId == clubId });
        Iter.toArray(filtered);
    };

    public shared ({ caller }) func deleteTeam(_caller : Principal, teamId : Nat) : async Bool {
        ensureUser(caller);

        switch (natMap.get(teams, teamId)) {
            case null {
                Debug.trap("Team not found");
            };
            case (?team) {
                if (not (hasTeamAdminRole(caller, teamId) or AccessControl.hasPermission(accessControlState, caller, #admin))) {
                    Debug.trap("Unauthorized: Only team admins or app admins can delete teams");
                };

                teams := natMap.delete(teams, teamId);
                true;
            };
        };
    };

    public type EventType = {
        #game;
        #training;
        #socialEvent;
    };

    public type DutyAssignment = {
        role : Text;
        assignee : Principal;
    };

    public type Event = {
        id : Nat;
        title : Text;
        description : Text;
        address : Text;
        suburb : Text;
        state : Text;
        postcode : Text;
        startTime : Time.Time;
        endTime : Time.Time;
        creator : Principal;
        clubId : ?Nat;
        teamId : ?Nat;
        recurrenceRule : ?RecurrenceRule;
        eventType : EventType;
        dutyRoster : [DutyAssignment];
        hideMap : Bool;
        hideAddress : Bool;
    };

    public type RecurrenceRule = {
        frequency : RecurrenceFrequency;
        interval : Nat;
        endDate : ?Time.Time;
        occurrences : ?Nat;
    };

    public type RecurrenceFrequency = {
        #daily;
        #weekly;
        #monthly;
        #custom;
    };

    var events = natMap.empty<Event>();
    var nextEventId : Nat = 1;

    var teamMemberships = natMap.empty<TeamMembership>();

    public shared ({ caller }) func createEvent(
        title : Text,
        description : Text,
        address : Text,
        suburb : Text,
        state : Text,
        postcode : Text,
        startTime : Time.Time,
        endTime : Time.Time,
        clubId : ?Nat,
        teamId : ?Nat,
        recurrenceRule : ?RecurrenceRule,
        eventType : EventType,
        dutyRoster : [DutyAssignment],
    ) : async Event {
        ensureUser(caller);

        let event : Event = {
            id = nextEventId;
            title;
            description;
            address;
            suburb;
            state;
            postcode;
            startTime;
            endTime;
            creator = caller;
            clubId;
            teamId;
            recurrenceRule;
            eventType;
            dutyRoster;
            hideMap = false;
            hideAddress = false;
        };

        events := natMap.put(events, nextEventId, event);
        nextEventId += 1;

        // Automatically invite all club members if clubId is provided
        switch (clubId) {
            case null {};
            case (?id) {
                let memberships = Iter.toArray(
                    Iter.filter(
                        natMap.vals(clubMemberships),
                        func(membership : ClubMembership) : Bool {
                            membership.clubId == id;
                        },
                    )
                );

                for (membership in memberships.vals()) {
                    ignore await addEventParticipant(event.id, membership.user);
                };

                // Invite all children assigned to teams within the club
                let clubTeams = Iter.toArray(
                    Iter.filter(
                        natMap.vals(teams),
                        func(team : Team) : Bool {
                            team.clubId == id;
                        },
                    )
                );

                for (team in clubTeams.vals()) {
                    let teamChildren = Iter.toArray(
                        Iter.filter(
                            natMap.vals(children),
                            func(child : Child) : Bool {
                                switch (child.teamId) {
                                    case null { false };
                                    case (?teamId) { teamId == team.id };
                                };
                            },
                        )
                    );

                    for (child in teamChildren.vals()) {
                        ignore await addEventChildParticipant(event.id, child.id);
                    };
                };

                // Add event creator as participant
                ignore await addEventParticipant(event.id, caller);
            };
        };

        // Automatically invite all team members if teamId is provided
        switch (teamId) {
            case null {};
            case (?id) {
                let teamMembershipsArray = Iter.toArray(
                    Iter.filter(
                        natMap.vals(teamMemberships),
                        func(membership : TeamMembership) : Bool {
                            membership.teamId == id;
                        },
                    )
                );

                for (membership in teamMembershipsArray.vals()) {
                    ignore await addEventParticipant(event.id, membership.user);
                };

                // Invite children assigned to the team
                let teamChildren = Iter.toArray(
                    Iter.filter(
                        natMap.vals(children),
                        func(child : Child) : Bool {
                            switch (child.teamId) {
                                case null { false };
                                case (?teamId) { teamId == id };
                            };
                        },
                    )
                );

                for (child in teamChildren.vals()) {
                    ignore await addEventChildParticipant(event.id, child.id);
                };

                // Add event creator as participant
                ignore await addEventParticipant(event.id, caller);
            };
        };

        // Send notifications to all event participants
        let participants = await getEventParticipants(event.id);
        for (participant in participants.vals()) {
            let notification : Notification = {
                id = nextNotificationId;
                user = participant.user;
                message = "You have been invited to event: " # title;
                timestamp = Time.now();
            };

            notifications := natMap.put(notifications, nextNotificationId, notification);
            nextNotificationId += 1;
        };

        // Send notifications for duty assignments
        for (duty in dutyRoster.vals()) {
            let notification : Notification = {
                id = nextNotificationId;
                user = duty.assignee;
                message = "You have been assigned a duty for event: " # title;
                timestamp = Time.now();
            };

            notifications := natMap.put(notifications, nextNotificationId, notification);
            nextNotificationId += 1;
        };

        event;
    };

    public query func getAllEvents() : async [Event] {
        Iter.toArray(natMap.vals(events));
    };

    public query func getEventById(id : Nat) : async ?Event {
        natMap.get(events, id);
    };

    public query func getEventsByClubId(clubId : Nat) : async [Event] {
        let filtered = Iter.filter(
            natMap.vals(events),
            func(event : Event) : Bool {
                switch (event.clubId) {
                    case null { false };
                    case (?id) { id == clubId };
                };
            },
        );
        Iter.toArray(filtered);
    };

    public query func getEventsByTeamId(teamId : Nat) : async [Event] {
        let filtered = Iter.filter(
            natMap.vals(events),
            func(event : Event) : Bool {
                switch (event.teamId) {
                    case null { false };
                    case (?id) { id == teamId };
                };
            },
        );
        Iter.toArray(filtered);
    };

    public shared ({ caller }) func deleteEvent(eventId : Nat) : async Bool {
        ensureUser(caller);

        switch (natMap.get(events, eventId)) {
            case null {
                Debug.trap("Event not found");
            };
            case (?event) {
                if (event.creator != caller and not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
                    Debug.trap("Unauthorized: Only event creators or admins can delete events");
                };

                events := natMap.delete(events, eventId);
                true;
            };
        };
    };

    public type EventParticipant = {
        eventId : Nat;
        user : Principal;
    };

    var eventParticipants = natMap.empty<EventParticipant>();
    var nextParticipantId : Nat = 1;

    public shared ({ caller }) func addEventParticipant(eventId : Nat, user : Principal) : async EventParticipant {
        ensureUser(caller);

        switch (natMap.get(events, eventId)) {
            case null {
                Debug.trap("Event not found");
            };
            case (?_event) {};
        };

        let participant : EventParticipant = {
            eventId;
            user;
        };

        eventParticipants := natMap.put(eventParticipants, nextParticipantId, participant);
        nextParticipantId += 1;

        participant;
    };

    public query func getEventParticipants(eventId : Nat) : async [EventParticipant] {
        let filtered = Iter.filter(
            natMap.vals(eventParticipants),
            func(participant : EventParticipant) : Bool {
                participant.eventId == eventId;
            },
        );
        Iter.toArray(filtered);
    };

    public type EventChildParticipant = {
        eventId : Nat;
        childId : Nat;
    };

    var eventChildParticipants = natMap.empty<EventChildParticipant>();
    var nextChildParticipantId : Nat = 1;

    public shared ({ caller }) func addEventChildParticipant(eventId : Nat, childId : Nat) : async EventChildParticipant {
        ensureUser(caller);

        switch (natMap.get(events, eventId)) {
            case null {
                Debug.trap("Event not found");
            };
            case (?_event) {};
        };

        let participant : EventChildParticipant = {
            eventId;
            childId;
        };

        eventChildParticipants := natMap.put(eventChildParticipants, nextChildParticipantId, participant);
        nextChildParticipantId += 1;

        participant;
    };

    public query func getEventChildParticipants(eventId : Nat) : async [EventChildParticipant] {
        let filtered = Iter.filter(
            natMap.vals(eventChildParticipants),
            func(participant : EventChildParticipant) : Bool {
                participant.eventId == eventId;
            },
        );
        Iter.toArray(filtered);
    };

    public type Message = {
        id : Nat;
        sender : Principal;
        content : Text;
        timestamp : Time.Time;
        threadId : Nat;
    };

    var messages = natMap.empty<Message>();
    var nextMessageId : Nat = 1;

    public shared ({ caller }) func sendMessage(content : Text, threadId : Nat) : async Message {
        ensureUser(caller);

        switch (natMap.get(messageThreads, threadId)) {
            case null {
                Debug.trap("Message thread not found");
            };
            case (?thread) {
                let message : Message = {
                    id = nextMessageId;
                    sender = caller;
                    content;
                    timestamp = Time.now();
                    threadId;
                };

                messages := natMap.put(messages, nextMessageId, message);
                nextMessageId += 1;

                // Send notifications to all thread members except sender
                let threadMembers = await getThreadMembers(threadId);
                for (member in threadMembers.vals()) {
                    if (member != caller) {
                        let senderDisplayName = switch (principalMap.get(userProfiles, caller)) {
                            case null { Principal.toText(caller) };
                            case (?profile) { profile.name };
                        };

                        let messagePreview = if (Text.size(content) > 20) {
                            content # "...";
                        } else {
                            content;
                        };

                        let notification : Notification = {
                            id = nextNotificationId;
                            user = member;
                            message = senderDisplayName # " has sent you a message: " # messagePreview;
                            timestamp = Time.now();
                        };

                        notifications := natMap.put(notifications, nextNotificationId, notification);
                        nextNotificationId += 1;
                    };
                };

                message;
            };
        };
    };

    public query func getAllMessages() : async [Message] {
        Iter.toArray(natMap.vals(messages));
    };

    public query func getMessageById(id : Nat) : async ?Message {
        natMap.get(messages, id);
    };

    public query func getMessagesBySender(sender : Principal) : async [Message] {
        let filtered = Iter.filter(
            natMap.vals(messages),
            func(message : Message) : Bool {
                message.sender == sender;
            },
        );
        Iter.toArray(filtered);
    };

    public query func getMessagesByThreadId(threadId : Nat) : async [Message] {
        let filtered = Iter.filter(
            natMap.vals(messages),
            func(message : Message) : Bool {
                message.threadId == threadId;
            },
        );
        Iter.toArray(filtered);
    };

    public type MessageThread = {
        id : Nat;
        name : Text;
        description : Text;
        clubId : ?Nat;
        teamId : ?Nat;
        creator : Principal;
        createdAt : Time.Time;
    };

    var messageThreads = natMap.empty<MessageThread>();
    var nextThreadId : Nat = 1;

    public shared ({ caller }) func createMessageThread(
        name : Text,
        description : Text,
        clubId : ?Nat,
        teamId : ?Nat,
    ) : async MessageThread {
        ensureUser(caller);

        let hasPermission = switch (clubId, teamId) {
            case (null, null) {
                Debug.trap("Authorization failed: No club or team specified. Checking roles for clubId: null, teamId: null");
            };
            case (?clubId, null) {
                let isClubAdmin = hasClubAdminRole(caller, clubId);
                if (not isClubAdmin) {
                    let userClubs = Iter.toArray(
                        Iter.filter(
                            natMap.vals(clubs),
                            func(club : Club) : Bool {
                                hasClubAdminRole(caller, club.id);
                            },
                        )
                    );

                    let clubNames = Array.map<Club, Text>(
                        userClubs,
                        func(club : Club) : Text {
                            club.name;
                        },
                    );

                    let clubNamesText = Array.foldLeft<Text, Text>(
                        clubNames,
                        "",
                        func(acc : Text, name : Text) : Text {
                            if (acc == "") { name } else { acc # ", " # name };
                        },
                    );

                    Debug.trap("Authorization failed: User is not a club admin for clubId: " # Nat.toText(clubId) # ". User is admin for clubs: " # clubNamesText);
                };
                isClubAdmin;
            };
            case (null, ?teamId) {
                let isTeamAdmin = hasTeamAdminRole(caller, teamId);
                if (not isTeamAdmin) {
                    Debug.trap("Authorization failed: User is not a team admin for teamId: " # Nat.toText(teamId));
                };
                isTeamAdmin;
            };
            case (?clubId, ?teamId) {
                let isClubAdmin = hasClubAdminRole(caller, clubId);
                let isTeamAdmin = hasTeamAdminRole(caller, teamId);
                if (not (isClubAdmin or isTeamAdmin)) {
                    let userClubs = Iter.toArray(
                        Iter.filter(
                            natMap.vals(clubs),
                            func(club : Club) : Bool {
                                hasClubAdminRole(caller, club.id);
                            },
                        )
                    );

                    let clubNames = Array.map<Club, Text>(
                        userClubs,
                        func(club : Club) : Text {
                            club.name;
                        },
                    );

                    let clubNamesText = Array.foldLeft<Text, Text>(
                        clubNames,
                        "",
                        func(acc : Text, name : Text) : Text {
                            if (acc == "") { name } else { acc # ", " # name };
                        },
                    );

                    Debug.trap("Authorization failed: User is not a club admin for clubId: " # Nat.toText(clubId) # " or a team admin for teamId: " # Nat.toText(teamId) # ". User is admin for clubs: " # clubNamesText);
                };
                isClubAdmin or isTeamAdmin;
            };
        };

        if (not hasPermission) {
            Debug.trap("Unauthorized: Only club or team admins can create message threads");
        };

        let thread : MessageThread = {
            id = nextThreadId;
            name;
            description;
            clubId;
            teamId;
            creator = caller;
            createdAt = Time.now();
        };

        messageThreads := natMap.put(messageThreads, nextThreadId, thread);
        nextThreadId += 1;

        thread;
    };

    public query func getAllMessageThreads() : async [MessageThread] {
        Iter.toArray(natMap.vals(messageThreads));
    };

    public query func getMessageThreadById(id : Nat) : async ?MessageThread {
        natMap.get(messageThreads, id);
    };

    public query func getMessageThreadsByClubId(clubId : Nat) : async [MessageThread] {
        let filtered = Iter.filter(
            natMap.vals(messageThreads),
            func(thread : MessageThread) : Bool {
                switch (thread.clubId) {
                    case null { false };
                    case (?id) { id == clubId };
                };
            },
        );
        Iter.toArray(filtered);
    };

    public query func getMessageThreadsByTeamId(teamId : Nat) : async [MessageThread] {
        let filtered = Iter.filter(
            natMap.vals(messageThreads),
            func(thread : MessageThread) : Bool {
                switch (thread.teamId) {
                    case null { false };
                    case (?id) { id == teamId };
                };
            },
        );
        Iter.toArray(filtered);
    };

    public query func getThreadMembers(threadId : Nat) : async [Principal] {
        switch (natMap.get(messageThreads, threadId)) {
            case null {
                Debug.trap("Message thread not found");
            };
            case (?thread) {
                var members : [Principal] = [];

                switch (thread.clubId) {
                    case null {};
                    case (?clubId) {
                        let clubMembershipsArray = Iter.toArray(
                            Iter.filter(
                                natMap.vals(clubMemberships),
                                func(membership : ClubMembership) : Bool {
                                    membership.clubId == clubId;
                                },
                            )
                        );

                        for (membership in clubMembershipsArray.vals()) {
                            members := Array.append(members, [membership.user]);
                        };
                    };
                };

                switch (thread.teamId) {
                    case null {};
                    case (?teamId) {
                        let teamMembershipsArray = Iter.toArray(
                            Iter.filter(
                                natMap.vals(teamMemberships),
                                func(membership : TeamMembership) : Bool {
                                    membership.teamId == teamId;
                                },
                            )
                        );

                        for (membership in teamMembershipsArray.vals()) {
                            members := Array.append(members, [membership.user]);
                        };
                    };
                };

                members;
            };
        };
    };

    public shared ({ caller }) func deleteMessageThread(threadId : Nat) : async Bool {
        ensureUser(caller);

        switch (natMap.get(messageThreads, threadId)) {
            case null {
                Debug.trap("Message thread not found");
            };
            case (?thread) {
                let hasPermission = switch (thread.clubId, thread.teamId) {
                    case (null, null) { false };
                    case (?clubId, null) { hasClubAdminRole(caller, clubId) };
                    case (null, ?teamId) { hasTeamAdminRole(caller, teamId) };
                    case (?clubId, ?teamId) { hasClubAdminRole(caller, clubId) or hasTeamAdminRole(caller, teamId) };
                };

                if (not hasPermission) {
                    Debug.trap("Unauthorized: Only club or team admins can delete message threads");
                };

                messageThreads := natMap.delete(messageThreads, threadId);
                true;
            };
        };
    };

    let inviteState = InviteLinksModule.initState();

    public shared ({ caller }) func generateInviteCode() : async Text {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Debug.trap("Unauthorized: Only admins can generate invite codes");
        };
        let blob = await Random.blob();
        let code = InviteLinksModule.generateUUID(blob);
        InviteLinksModule.generateInviteCode(inviteState, code);
        code;
    };

    public func submitRSVP(name : Text, attending : Bool, inviteCode : Text) : async () {
        InviteLinksModule.submitRSVP(inviteState, name, attending, inviteCode);
    };

    public query ({ caller }) func getAllRSVPs() : async [InviteLinksModule.RSVP] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Debug.trap("Unauthorized: Only admins can view RSVPs");
        };
        InviteLinksModule.getAllRSVPs(inviteState);
    };

    public query ({ caller }) func getInviteCodes() : async [InviteLinksModule.InviteCode] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Debug.trap("Unauthorized: Only admins can view invite codes");
        };
        InviteLinksModule.getInviteCodes(inviteState);
    };

    var stripeConfiguration : ?Stripe.StripeConfiguration = null;

    public query func isStripeConfigured() : async Bool {
        return stripeConfiguration != null;
    };

    public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Debug.trap("Unauthorized: Only admins can perform this action");
        };
        stripeConfiguration := ?config;
    };

    private func getStripeConfiguration() : Stripe.StripeConfiguration {
        switch (stripeConfiguration) {
            case null Debug.trap("Stripe needs to be first configured");
            case (?value) value;
        };
    };

    public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
        await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
    };

    public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
        await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
    };

    public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
        OutCall.transform(input);
    };

    public type Child = {
        id : Nat;
        name : Text;
        dateOfBirth : Time.Time;
        parent : Principal;
        teamId : ?Nat;
    };

    var children = natMap.empty<Child>();
    var nextChildId : Nat = 1;

    public shared ({ caller }) func createChild(name : Text, dateOfBirth : Time.Time, teamId : ?Nat) : async Child {
        ensureUser(caller);

        let child : Child = {
            id = nextChildId;
            name;
            dateOfBirth;
            parent = caller;
            teamId;
        };

        children := natMap.put(children, nextChildId, child);
        nextChildId += 1;

        child;
    };

    public query func getAllChildren() : async [Child] {
        Iter.toArray(natMap.vals(children));
    };

    public query func getChildById(id : Nat) : async ?Child {
        natMap.get(children, id);
    };

    public query func getChildrenByParent(parent : Principal) : async [Child] {
        let filtered = Iter.filter(
            natMap.vals(children),
            func(child : Child) : Bool {
                child.parent == parent;
            },
        );
        Iter.toArray(filtered);
    };

    public shared ({ caller }) func updateChild(childId : Nat, name : Text, dateOfBirth : Time.Time, teamId : ?Nat) : async Child {
        ensureUser(caller);

        switch (natMap.get(children, childId)) {
            case null {
                Debug.trap("Child not found");
            };
            case (?child) {
                if (child.parent != caller) {
                    Debug.trap("Unauthorized: Only parents can update their children");
                };

                let updatedChild : Child = {
                    id = childId;
                    name;
                    dateOfBirth;
                    parent = caller;
                    teamId;
                };

                children := natMap.put(children, childId, updatedChild);
                updatedChild;
            };
        };
    };

    public shared ({ caller }) func deleteChild(childId : Nat) : async Bool {
        ensureUser(caller);

        switch (natMap.get(children, childId)) {
            case null {
                Debug.trap("Child not found");
            };
            case (?child) {
                if (child.parent != caller) {
                    Debug.trap("Unauthorized: Only parents can delete their children");
                };

                children := natMap.delete(children, childId);
                true;
            };
        };
    };

    public type ClubRole = {
        #clubAdmin;
    };

    public type ClubMembership = {
        user : Principal;
        clubId : Nat;
        roles : [ClubRole];
    };

    var clubMemberships = natMap.empty<ClubMembership>();
    var nextMembershipId : Nat = 1;

    public shared ({ caller }) func addClubMembership(clubId : Nat, roles : [ClubRole]) : async ClubMembership {
        ensureUser(caller);

        switch (natMap.get(clubs, clubId)) {
            case null {
                Debug.trap("Club not found");
            };
            case (?_club) {};
        };

        let membership : ClubMembership = {
            user = caller;
            clubId;
            roles;
        };

        clubMemberships := natMap.put(clubMemberships, nextMembershipId, membership);
        nextMembershipId += 1;

        membership;
    };

    public query func getClubMembershipsByClub(clubId : Nat) : async [ClubMembership] {
        let filtered = Iter.filter(
            natMap.vals(clubMemberships),
            func(membership : ClubMembership) : Bool {
                membership.clubId == clubId;
            },
        );
        Iter.toArray(filtered);
    };

    public query func getUniqueMemberCount(clubId : Nat) : async Nat {
        let memberships = Iter.toArray(
            Iter.filter(
                natMap.vals(clubMemberships),
                func(membership : ClubMembership) : Bool {
                    membership.clubId == clubId;
                },
            )
        );

        var uniqueCount = 0;
        for (membership in memberships.vals()) {
            uniqueCount += 1;
        };

        uniqueCount;
    };

    public type TeamRole = {
        #teamAdmin;
        #coach;
        #player;
        #parent;
    };

    public type TeamMembership = {
        user : Principal;
        teamId : Nat;
        roles : [TeamRole];
    };

    var nextTeamMembershipId : Nat = 1;

    public shared ({ caller }) func addTeamMembership(teamId : Nat, roles : [TeamRole]) : async TeamMembership {
        ensureUser(caller);

        switch (natMap.get(teams, teamId)) {
            case null {
                Debug.trap("Team not found");
            };
            case (?_team) {};
        };

        let membership : TeamMembership = {
            user = caller;
            teamId;
            roles;
        };

        teamMemberships := natMap.put(teamMemberships, nextTeamMembershipId, membership);
        nextTeamMembershipId += 1;

        membership;
    };

    public query func getTeamMembershipsByTeam(teamId : Nat) : async [TeamMembership] {
        let filtered = Iter.filter(
            natMap.vals(teamMemberships),
            func(membership : TeamMembership) : Bool {
                membership.teamId == teamId;
            },
        );
        Iter.toArray(filtered);
    };

    public query func getTeamMembersByTeamId(teamId : Nat) : async [Principal] {
        let memberships = Iter.toArray(
            Iter.filter(
                natMap.vals(teamMemberships),
                func(membership : TeamMembership) : Bool {
                    membership.teamId == teamId;
                },
            )
        );

        let members = Array.map<TeamMembership, Principal>(
            memberships,
            func(membership : TeamMembership) : Principal {
                membership.user;
            },
        );

        members;
    };

    public type JoinRequest = {
        id : Nat;
        user : Principal;
        clubId : Nat;
        teamId : Nat;
        status : JoinRequestStatus;
        timestamp : Time.Time;
        requestedRole : TeamRole;
    };

    public type JoinRequestStatus = {
        #pending;
        #approved;
        #denied;
    };

    var joinRequests = natMap.empty<JoinRequest>();
    var nextJoinRequestId : Nat = 1;

    public shared ({ caller }) func submitJoinRequest(clubId : Nat, teamId : Nat, requestedRole : TeamRole) : async JoinRequest {
        ensureUser(caller);

        switch (natMap.get(clubs, clubId)) {
            case null {
                Debug.trap("Club not found");
            };
            case (?_club) {};
        };

        switch (natMap.get(teams, teamId)) {
            case null {
                Debug.trap("Team not found");
            };
            case (?_team) {};
        };

        let request : JoinRequest = {
            id = nextJoinRequestId;
            user = caller;
            clubId;
            teamId;
            status = #pending;
            timestamp = Time.now();
            requestedRole;
        };

        joinRequests := natMap.put(joinRequests, nextJoinRequestId, request);
        nextJoinRequestId += 1;

        // Notify all team admins for the relevant team
        let teamAdmins = Iter.toArray(
            Iter.filter(
                natMap.vals(teamMemberships),
                func(membership : TeamMembership) : Bool {
                    membership.teamId == teamId and Array.find<TeamRole>(membership.roles, func(role : TeamRole) : Bool { role == #teamAdmin }) != null
                },
            )
        );

        for (admin in teamAdmins.vals()) {
            let notification : Notification = {
                id = nextNotificationId;
                user = admin.user;
                message = "New join request for team " # Nat.toText(teamId) # " in club " # Nat.toText(clubId) # " with requested role " # teamRoleToText(requestedRole);
                timestamp = Time.now();
            };

            notifications := natMap.put(notifications, nextNotificationId, notification);
            nextNotificationId += 1;
        };

        request;
    };

    func teamRoleToText(role : TeamRole) : Text {
        switch (role) {
            case (#teamAdmin) { "Team Admin" };
            case (#coach) { "Coach" };
            case (#player) { "Player" };
            case (#parent) { "Parent" };
        };
    };

    public query func getJoinRequestsByClub(clubId : Nat) : async [JoinRequest] {
        let filtered = Iter.filter(
            natMap.vals(joinRequests),
            func(request : JoinRequest) : Bool {
                request.clubId == clubId;
            },
        );
        Iter.toArray(filtered);
    };

    public query func getJoinRequestsByTeam(teamId : Nat) : async [JoinRequest] {
        let filtered = Iter.filter(
            natMap.vals(joinRequests),
            func(request : JoinRequest) : Bool {
                request.teamId == teamId;
            },
        );
        Iter.toArray(filtered);
    };

    public query func getAllJoinRequests() : async [JoinRequest] {
        Iter.toArray(natMap.vals(joinRequests));
    };

    public shared ({ caller }) func approveJoinRequest(requestId : Nat) : async Bool {
        ensureUser(caller);

        switch (natMap.get(joinRequests, requestId)) {
            case null {
                Debug.trap("Join request not found");
            };
            case (?request) {
                switch (natMap.get(clubs, request.clubId)) {
                    case null {
                        Debug.trap("Club not found");
                    };
                    case (?_club) {
                        switch (natMap.get(teams, request.teamId)) {
                            case null {
                                Debug.trap("Team not found");
                            };
                            case (?_team) {
                                if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
                                    Debug.trap("Unauthorized: Only admins can approve join requests");
                                };

                                let updatedRequest : JoinRequest = {
                                    request with status = #approved
                                };

                                joinRequests := natMap.put(joinRequests, requestId, updatedRequest);

                                // Create notification for the user
                                let notification : Notification = {
                                    id = nextNotificationId;
                                    user = request.user;
                                    message = "Your join request for team " # Nat.toText(request.teamId) # " in club " # Nat.toText(request.clubId) # " has been approved";
                                    timestamp = Time.now();
                                };

                                notifications := natMap.put(notifications, nextNotificationId, notification);
                                nextNotificationId += 1;

                                // Add user as team member with requested role
                                let teamMembership : TeamMembership = {
                                    user = request.user;
                                    teamId = request.teamId;
                                    roles = [request.requestedRole];
                                };

                                teamMemberships := natMap.put(teamMemberships, nextTeamMembershipId, teamMembership);
                                nextTeamMembershipId += 1;

                                true;
                            };
                        };
                    };
                };
            };
        };
    };

    public shared ({ caller }) func denyJoinRequest(requestId : Nat) : async Bool {
        ensureUser(caller);

        switch (natMap.get(joinRequests, requestId)) {
            case null {
                Debug.trap("Join request not found");
            };
            case (?request) {
                switch (natMap.get(clubs, request.clubId)) {
                    case null {
                        Debug.trap("Club not found");
                    };
                    case (?_club) {
                        switch (natMap.get(teams, request.teamId)) {
                            case null {
                                Debug.trap("Team not found");
                            };
                            case (?_team) {
                                if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
                                    Debug.trap("Unauthorized: Only admins can deny join requests");
                                };

                                let updatedRequest : JoinRequest = {
                                    request with status = #denied
                                };

                                joinRequests := natMap.put(joinRequests, requestId, updatedRequest);

                                // Create notification for the user
                                let notification : Notification = {
                                    id = nextNotificationId;
                                    user = request.user;
                                    message = "Your join request for team " # Nat.toText(request.teamId) # " in club " # Nat.toText(request.clubId) # " has been denied";
                                    timestamp = Time.now();
                                };

                                notifications := natMap.put(notifications, nextNotificationId, notification);
                                nextNotificationId += 1;

                                true;
                            };
                        };
                    };
                };
            };
        };
    };

    public query func getJoinRequestById(requestId : Nat) : async ?JoinRequest {
        natMap.get(joinRequests, requestId);
    };

    public type Notification = {
        id : Nat;
        user : Principal;
        message : Text;
        timestamp : Time.Time;
    };

    var notifications = natMap.empty<Notification>();
    var nextNotificationId : Nat = 1;

    public query ({ caller }) func getNotifications() : async [Notification] {
        let filtered = Iter.filter(
            natMap.vals(notifications),
            func(notification : Notification) : Bool {
                notification.user == caller;
            },
        );
        Iter.toArray(filtered);
    };

    public shared ({ caller }) func clearAllNotifications() : async () {
        var newNotifications = natMap.empty<Notification>();
        for ((id, notification) in natMap.entries(notifications)) {
            if (notification.user != caller) {
                newNotifications := natMap.put(newNotifications, id, notification);
            };
        };
        notifications := newNotifications;
    };

    public shared ({ caller }) func updateEventPrivacy(eventId : Nat, hideMap : Bool, hideAddress : Bool) : async Event {
        ensureUser(caller);

        switch (natMap.get(events, eventId)) {
            case null {
                Debug.trap("Event not found");
            };
            case (?event) {
                let hasPermission = switch (event.clubId, event.teamId) {
                    case (null, null) { false };
                    case (?clubId, null) { hasClubAdminRole(caller, clubId) };
                    case (null, ?teamId) { hasTeamAdminRole(caller, teamId) };
                    case (?clubId, ?teamId) { hasClubAdminRole(caller, clubId) or hasTeamAdminRole(caller, teamId) };
                };

                if (not hasPermission) {
                    Debug.trap("Unauthorized: Only club or team admins can update event privacy settings");
                };

                let updatedEvent : Event = {
                    event with
                    hideMap = hideMap;
                    hideAddress = hideAddress;
                };

                events := natMap.put(events, eventId, updatedEvent);
                updatedEvent;
            };
        };
    };

    public type Announcement = {
        id : Nat;
        title : Text;
        content : Text;
        creator : Principal;
        timestamp : Time.Time;
        clubId : ?Nat;
        teamId : ?Nat;
    };

    var announcements = natMap.empty<Announcement>();
    var nextAnnouncementId : Nat = 1;

    public shared ({ caller }) func createAnnouncement(
        title : Text,
        content : Text,
        clubId : ?Nat,
        teamId : ?Nat,
    ) : async Announcement {
        ensureUser(caller);

        let hasPermission = switch (clubId, teamId) {
            case (null, null) {
                Debug.trap("Authorization failed: No club or team specified. Checking roles for clubId: null, teamId: null");
            };
            case (?clubId, null) {
                let isClubAdmin = hasClubAdminRole(caller, clubId);
                if (not isClubAdmin) {
                    let userClubs = Iter.toArray(
                        Iter.filter(
                            natMap.vals(clubs),
                            func(club : Club) : Bool {
                                hasClubAdminRole(caller, club.id);
                            },
                        )
                    );

                    let clubNames = Array.map<Club, Text>(
                        userClubs,
                        func(club : Club) : Text {
                            club.name;
                        },
                    );

                    let clubNamesText = Array.foldLeft<Text, Text>(
                        clubNames,
                        "",
                        func(acc : Text, name : Text) : Text {
                            if (acc == "") { name } else { acc # ", " # name };
                        },
                    );

                    Debug.trap("Authorization failed: User is not a club admin for clubId: " # Nat.toText(clubId) # ". User is admin for clubs: " # clubNamesText);
                };
                isClubAdmin;
            };
            case (null, ?teamId) {
                let isTeamAdmin = hasTeamAdminRole(caller, teamId);
                if (not isTeamAdmin) {
                    Debug.trap("Authorization failed: User is not a team admin for teamId: " # Nat.toText(teamId));
                };
                isTeamAdmin;
            };
            case (?clubId, ?teamId) {
                let isClubAdmin = hasClubAdminRole(caller, clubId);
                let isTeamAdmin = hasTeamAdminRole(caller, teamId);
                if (not (isClubAdmin or isTeamAdmin)) {
                    let userClubs = Iter.toArray(
                        Iter.filter(
                            natMap.vals(clubs),
                            func(club : Club) : Bool {
                                hasClubAdminRole(caller, club.id);
                            },
                        )
                    );

                    let clubNames = Array.map<Club, Text>(
                        userClubs,
                        func(club : Club) : Text {
                            club.name;
                        },
                    );

                    let clubNamesText = Array.foldLeft<Text, Text>(
                        clubNames,
                        "",
                        func(acc : Text, name : Text) : Text {
                            if (acc == "") { name } else { acc # ", " # name };
                        },
                    );

                    Debug.trap("Authorization failed: User is not a club admin for clubId: " # Nat.toText(clubId) # " or a team admin for teamId: " # Nat.toText(teamId) # ". User is admin for clubs: " # clubNamesText);
                };
                isClubAdmin or isTeamAdmin;
            };
        };

        if (not hasPermission) {
            Debug.trap("Unauthorized: Only club or team admins can create announcements");
        };

        let announcement : Announcement = {
            id = nextAnnouncementId;
            title;
            content;
            creator = caller;
            timestamp = Time.now();
            clubId;
            teamId;
        };

        announcements := natMap.put(announcements, nextAnnouncementId, announcement);
        nextAnnouncementId += 1;

        announcement;
    };

    public query func getAllAnnouncements() : async [Announcement] {
        let allAnnouncements = Iter.toArray(natMap.vals(announcements));
        let uniqueAnnouncements = removeDuplicateAnnouncements(allAnnouncements);
        uniqueAnnouncements;
    };

    func removeDuplicateAnnouncements(announcements : [Announcement]) : [Announcement] {
        let natSet = Set.Make<Nat>(Nat.compare);
        var seenIds = natSet.empty();
        var uniqueAnnouncements : [Announcement] = [];

        for (announcement in announcements.vals()) {
            if (not natSet.contains(seenIds, announcement.id)) {
                seenIds := natSet.put(seenIds, announcement.id);
                uniqueAnnouncements := Array.append(uniqueAnnouncements, [announcement]);
            };
        };

        uniqueAnnouncements;
    };

    public query func getAnnouncementsByClubId(clubId : Nat) : async [Announcement] {
        let filtered = Iter.filter(
            natMap.vals(announcements),
            func(announcement : Announcement) : Bool {
                switch (announcement.clubId) {
                    case null { false };
                    case (?id) { id == clubId };
                };
            },
        );
        Iter.toArray(filtered);
    };

    public query func getAnnouncementsByTeamId(teamId : Nat) : async [Announcement] {
        let filtered = Iter.filter(
            natMap.vals(announcements),
            func(announcement : Announcement) : Bool {
                switch (announcement.teamId) {
                    case null { false };
                    case (?id) { id == teamId };
                };
            },
        );
        Iter.toArray(filtered);
    };

    public query func getAnnouncementById(id : Nat) : async ?Announcement {
        natMap.get(announcements, id);
    };

    public shared ({ caller }) func deleteAnnouncement(announcementId : Nat) : async Bool {
        ensureUser(caller);

        switch (natMap.get(announcements, announcementId)) {
            case null {
                Debug.trap("Announcement not found");
            };
            case (?announcement) {
                let hasPermission = switch (announcement.clubId, announcement.teamId) {
                    case (null, null) { false };
                    case (?clubId, null) { hasClubAdminRole(caller, clubId) };
                    case (null, ?teamId) { hasTeamAdminRole(caller, teamId) };
                    case (?clubId, ?teamId) { hasClubAdminRole(caller, clubId) or hasTeamAdminRole(caller, teamId) };
                };

                if (not hasPermission) {
                    Debug.trap("Unauthorized: Only club or team admins can delete announcements");
                };

                announcements := natMap.delete(announcements, announcementId);
                true;
            };
        };
    };

    public type Photo = {
        id : Nat;
        uploader : Principal;
        filePath : Text;
        timestamp : Time.Time;
        clubId : ?Nat;
        teamId : ?Nat;
    };

    var photos = natMap.empty<Photo>();
    var nextPhotoId : Nat = 1;

    public shared ({ caller }) func uploadPhoto(filePath : Text, clubId : ?Nat, teamId : ?Nat) : async Photo {
        ensureUser(caller);

        let hasPermission = switch (clubId, teamId) {
            case (null, null) { true };
            case (?clubId, null) { hasClubAdminRole(caller, clubId) };
            case (null, ?teamId) { hasTeamAdminRole(caller, teamId) };
            case (?clubId, ?teamId) { hasClubAdminRole(caller, clubId) or hasTeamAdminRole(caller, teamId) };
        };

        if (not hasPermission) {
            Debug.trap("Unauthorized: Only club or team admins can upload photos");
        };

        let photo : Photo = {
            id = nextPhotoId;
            uploader = caller;
            filePath;
            timestamp = Time.now();
            clubId;
            teamId;
        };

        photos := natMap.put(photos, nextPhotoId, photo);
        nextPhotoId += 1;

        photo;
    };

    public query func getAllPhotos() : async [Photo] {
        Iter.toArray(natMap.vals(photos));
    };

    public query func getPhotosByClubId(clubId : Nat) : async [Photo] {
        let filtered = Iter.filter(
            natMap.vals(photos),
            func(photo : Photo) : Bool {
                switch (photo.clubId) {
                    case null { false };
                    case (?id) { id == clubId };
                };
            },
        );
        Iter.toArray(filtered);
    };

    public query func getPhotosByTeamId(teamId : Nat) : async [Photo] {
        let filtered = Iter.filter(
            natMap.vals(photos),
            func(photo : Photo) : Bool {
                switch (photo.teamId) {
                    case null { false };
                    case (?id) { id == teamId };
                };
            },
        );
        Iter.toArray(filtered);
    };

    public query func getPhotoById(id : Nat) : async ?Photo {
        natMap.get(photos, id);
    };

    public type PhotoReaction = {
        photoId : Nat;
        user : Principal;
        reaction : Text;
    };

    var photoReactions = natMap.empty<PhotoReaction>();
    var nextReactionId : Nat = 1;

    public shared ({ caller }) func reactToPhoto(photoId : Nat, reaction : Text) : async PhotoReaction {
        ensureUser(caller);

        switch (natMap.get(photos, photoId)) {
            case null {
                Debug.trap("Photo not found");
            };
            case (?photo) {
                let hasPermission = switch (photo.clubId, photo.teamId) {
                    case (null, null) { true };
                    case (?clubId, null) { hasClubAdminRole(caller, clubId) };
                    case (null, ?teamId) { hasTeamAdminRole(caller, teamId) };
                    case (?clubId, ?teamId) { hasClubAdminRole(caller, clubId) or hasTeamAdminRole(caller, teamId) };
                };

                if (not hasPermission) {
                    Debug.trap("Unauthorized: Only club or team members can react to photos");
                };

                // Remove existing reaction from the same user for this photo
                let existingReactions = Iter.toArray(
                    Iter.filter(
                        natMap.vals(photoReactions),
                        func(r : PhotoReaction) : Bool {
                            r.photoId == photoId and r.user == caller
                        },
                    )
                );

                for (r in existingReactions.vals()) {
                    let entries = Iter.toArray(natMap.entries(photoReactions));
                    for ((id, reaction) in entries.vals()) {
                        if (reaction.photoId == r.photoId and reaction.user == r.user) {
                            photoReactions := natMap.delete(photoReactions, id);
                        };
                    };
                };

                let photoReaction : PhotoReaction = {
                    photoId;
                    user = caller;
                    reaction;
                };

                photoReactions := natMap.put(photoReactions, nextReactionId, photoReaction);
                nextReactionId += 1;

                // Send notification to photo uploader with reactor's display name
                let reactorDisplayName = switch (principalMap.get(userProfiles, caller)) {
                    case null { Principal.toText(caller) };
                    case (?profile) { profile.name };
                };

                let notification : Notification = {
                    id = nextNotificationId;
                    user = photo.uploader;
                    message = reactorDisplayName # " reacted to your photo";
                    timestamp = Time.now();
                };

                notifications := natMap.put(notifications, nextNotificationId, notification);
                nextNotificationId += 1;

                photoReaction;
            };
        };
    };

    public query func getPhotoReactions(photoId : Nat) : async [PhotoReaction] {
        let filtered = Iter.filter(
            natMap.vals(photoReactions),
            func(reaction : PhotoReaction) : Bool {
                reaction.photoId == photoId;
            },
        );
        Iter.toArray(filtered);
    };

    public type PhotoComment = {
        id : Nat;
        photoId : Nat;
        user : Principal;
        comment : Text;
        timestamp : Time.Time;
        displayName : Text;
    };

    var photoComments = natMap.empty<PhotoComment>();
    var nextCommentId : Nat = 1;

    public shared ({ caller }) func commentOnPhoto(photoId : Nat, comment : Text) : async PhotoComment {
        ensureUser(caller);

        switch (natMap.get(photos, photoId)) {
            case null {
                Debug.trap("Photo not found");
            };
            case (?photo) {
                let hasPermission = switch (photo.clubId, photo.teamId) {
                    case (null, null) { true };
                    case (?clubId, null) { hasClubAdminRole(caller, clubId) };
                    case (null, ?teamId) { hasTeamAdminRole(caller, teamId) };
                    case (?clubId, ?teamId) { hasClubAdminRole(caller, clubId) or hasTeamAdminRole(caller, teamId) };
                };

                if (not hasPermission) {
                    Debug.trap("Unauthorized: Only club or team members can comment on photos");
                };

                // Get user's display name or principal ID
                let displayName = switch (principalMap.get(userProfiles, caller)) {
                    case null { Principal.toText(caller) };
                    case (?profile) { profile.name };
                };

                let photoComment : PhotoComment = {
                    id = nextCommentId;
                    photoId;
                    user = caller;
                    comment;
                    timestamp = Time.now();
                    displayName = displayName;
                };

                photoComments := natMap.put(photoComments, nextCommentId, photoComment);
                nextCommentId += 1;

                // Send notification to photo uploader only
                let notification : Notification = {
                    id = nextNotificationId;
                    user = photo.uploader;
                    message = displayName # " commented on your photo";
                    timestamp = Time.now();
                };

                notifications := natMap.put(notifications, nextNotificationId, notification);
                nextNotificationId += 1;

                photoComment;
            };
        };
    };

    public query func getPhotoComments(photoId : Nat) : async [PhotoComment] {
        let filtered = Iter.filter(
            natMap.vals(photoComments),
            func(comment : PhotoComment) : Bool {
                comment.photoId == photoId;
            },
        );
        Iter.toArray(filtered);
    };

    public type File = {
        id : Nat;
        uploader : Principal;
        filePath : Text;
        timestamp : Time.Time;
        clubId : ?Nat;
        teamId : ?Nat;
    };

    var files = natMap.empty<File>();
    var nextFileId : Nat = 1;

    public shared ({ caller }) func uploadFile(filePath : Text, clubId : ?Nat, teamId : ?Nat) : async File {
        ensureUser(caller);

        let hasPermission = switch (clubId, teamId) {
            case (null, null) { true };
            case (?clubId, null) { hasClubAdminRole(caller, clubId) };
            case (null, ?teamId) { hasTeamAdminRole(caller, teamId) };
            case (?clubId, ?teamId) { hasClubAdminRole(caller, clubId) or hasTeamAdminRole(caller, teamId) };
        };

        if (not hasPermission) {
            Debug.trap("Unauthorized: Only club or team admins can upload files");
        };

        let file : File = {
            id = nextFileId;
            uploader = caller;
            filePath;
            timestamp = Time.now();
            clubId;
            teamId;
        };

        files := natMap.put(files, nextFileId, file);
        nextFileId += 1;

        file;
    };

    public query func getAllFiles() : async [File] {
        Iter.toArray(natMap.vals(files));
    };

    public query func getFilesByClubId(clubId : Nat) : async [File] {
        let filtered = Iter.filter(
            natMap.vals(files),
            func(file : File) : Bool {
                switch (file.clubId) {
                    case null { false };
                    case (?id) { id == clubId };
                };
            },
        );
        Iter.toArray(filtered);
    };

    public query func getFilesByTeamId(teamId : Nat) : async [File] {
        let filtered = Iter.filter(
            natMap.vals(files),
            func(file : File) : Bool {
                switch (file.teamId) {
                    case null { false };
                    case (?id) { id == teamId };
                };
            },
        );
        Iter.toArray(filtered);
    };

    public query func getFileById(id : Nat) : async ?File {
        natMap.get(files, id);
    };

    public query func getVaultFolders() : async [Text] {
        var folders : [Text] = [];

        for (club in natMap.vals(clubs)) {
            folders := Array.append(folders, ["club_" # Nat.toText(club.id)]);
        };

        for (team in natMap.vals(teams)) {
            folders := Array.append(folders, ["team_" # Nat.toText(team.id)]);
        };

        folders;
    };

    public query func getPhotosByFolder(folder : Text) : async [Photo] {
        let filtered = Iter.filter(
            natMap.vals(photos),
            func(photo : Photo) : Bool {
                let clubMatch = switch (photo.clubId) {
                    case null { false };
                    case (?id) { "club_" # Nat.toText(id) == folder };
                };

                let teamMatch = switch (photo.teamId) {
                    case null { false };
                    case (?id) { "team_" # Nat.toText(id) == folder };
                };

                clubMatch or teamMatch;
            },
        );
        Iter.toArray(filtered);
    };

    public query func getFilesByFolder(folder : Text) : async [File] {
        let filtered = Iter.filter(
            natMap.vals(files),
            func(file : File) : Bool {
                let clubMatch = switch (file.clubId) {
                    case null { false };
                    case (?id) { "club_" # Nat.toText(id) == folder };
                };

                let teamMatch = switch (file.teamId) {
                    case null { false };
                    case (?id) { "team_" # Nat.toText(id) == folder };
                };

                clubMatch or teamMatch;
            },
        );
        Iter.toArray(filtered);
    };

    public type MatchDayPost = {
        id : Nat;
        eventId : Nat;
        imagePath : Text;
        timestamp : Time.Time;
    };

    var matchDayPosts = natMap.empty<MatchDayPost>();
    var nextMatchDayPostId : Nat = 1;

    public shared ({ caller }) func generateMatchDayPost(eventId : Nat, imagePath : Text) : async MatchDayPost {
        ensureUser(caller);

        switch (natMap.get(events, eventId)) {
            case null {
                Debug.trap("Event not found");
            };
            case (?event) {
                let hasPermission = switch (event.clubId, event.teamId) {
                    case (null, null) { false };
                    case (?clubId, null) { hasClubAdminRole(caller, clubId) };
                    case (null, ?teamId) { hasTeamAdminRole(caller, teamId) };
                    case (?clubId, ?teamId) { hasClubAdminRole(caller, clubId) or hasTeamAdminRole(caller, teamId) };
                };

                if (not hasPermission) {
                    Debug.trap("Unauthorized: Only club or team admins can generate match day posts");
                };

                let matchDayPost : MatchDayPost = {
                    id = nextMatchDayPostId;
                    eventId;
                    imagePath;
                    timestamp = Time.now();
                };

                matchDayPosts := natMap.put(matchDayPosts, nextMatchDayPostId, matchDayPost);
                nextMatchDayPostId += 1;

                matchDayPost;
            };
        };
    };

    public query func getAllMatchDayPosts() : async [MatchDayPost] {
        Iter.toArray(natMap.vals(matchDayPosts));
    };

    public query func getMatchDayPostsByEventId(eventId : Nat) : async [MatchDayPost] {
        let filtered = Iter.filter(
            natMap.vals(matchDayPosts),
            func(post : MatchDayPost) : Bool {
                post.eventId == eventId;
            },
        );
        Iter.toArray(filtered);
    };

    public query func getMatchDayPostById(id : Nat) : async ?MatchDayPost {
        natMap.get(matchDayPosts, id);
    };

    public shared ({ caller }) func updateClubLogo(clubId : Nat, logoPath : Text) : async Club {
        ensureUser(caller);

        switch (natMap.get(clubs, clubId)) {
            case null {
                Debug.trap("Club not found");
            };
            case (?club) {
                if (not hasClubAdminRole(caller, clubId)) {
                    Debug.trap("Unauthorized: Only club admins can update club logo");
                };

                let updatedClub : Club = {
                    club with logo = ?logoPath
                };

                clubs := natMap.put(clubs, clubId, updatedClub);
                updatedClub;
            };
        };
    };

    public query ({ caller }) func me() : async {
        registered : Bool;
        isAdmin : Bool;
        role : AccessControl.UserRole;
        isProfileComplete : Bool;
    } {
        let registered = principalMap.get(userProfiles, caller) != null;
        let isAdmin = AccessControl.hasPermission(accessControlState, caller, #admin);
        let role = AccessControl.getUserRole(accessControlState, caller);
        let isProfileComplete = switch (principalMap.get(userProfiles, caller)) {
            case null { false };
            case (?profile) { profile.isProfileComplete };
        };

        {
            registered;
            isAdmin;
            role;
            isProfileComplete;
        };
    };

    public query func getDisplayName(principal : Principal) : async Text {
        switch (principalMap.get(userProfiles, principal)) {
            case null { Principal.toText(principal) };
            case (?profile) { profile.name };
        };
    };

    public query func getTeamMembersWithDisplayNames(teamId : Nat) : async [(Principal, Text)] {
        let memberships = Iter.toArray(
            Iter.filter(
                natMap.vals(teamMemberships),
                func(membership : TeamMembership) : Bool {
                    membership.teamId == teamId;
                },
            )
        );

        let members = Array.map<TeamMembership, (Principal, Text)>(
            memberships,
            func(membership : TeamMembership) : (Principal, Text) {
                let displayName = switch (principalMap.get(userProfiles, membership.user)) {
                    case null { Principal.toText(membership.user) };
                    case (?profile) { profile.name };
                };
                (membership.user, displayName);
            },
        );

        members;
    };

    public query func getClubMembersWithDisplayNames(clubId : Nat) : async [(Principal, Text)] {
        let memberships = Iter.toArray(
            Iter.filter(
                natMap.vals(clubMemberships),
                func(membership : ClubMembership) : Bool {
                    membership.clubId == clubId;
                },
            )
        );

        let members = Array.map<ClubMembership, (Principal, Text)>(
            memberships,
            func(membership : ClubMembership) : (Principal, Text) {
                let displayName = switch (principalMap.get(userProfiles, membership.user)) {
                    case null { Principal.toText(membership.user) };
                    case (?profile) { profile.name };
                };
                (membership.user, displayName);
            },
        );

        members;
    };

    public query func getAnnouncementCommentsWithDisplayNames(announcementId : Nat) : async [(Principal, Text)] {
        let comments = Iter.toArray(
            Iter.filter(
                natMap.vals(announcementComments),
                func(comment : AnnouncementComment) : Bool {
                    comment.announcementId == announcementId;
                },
            )
        );

        let commentsWithDisplayNames = Array.map<AnnouncementComment, (Principal, Text)>(
            comments,
            func(comment : AnnouncementComment) : (Principal, Text) {
                let displayName = switch (principalMap.get(userProfiles, comment.user)) {
                    case null { Principal.toText(comment.user) };
                    case (?profile) { profile.name };
                };
                (comment.user, displayName);
            },
        );

        commentsWithDisplayNames;
    };

    public query func getMessageThreadIdForTeam(teamId : Nat) : async ?Nat {
        let threads = Iter.toArray(
            Iter.filter(
                natMap.vals(messageThreads),
                func(thread : MessageThread) : Bool {
                    switch (thread.teamId) {
                        case null { false };
                        case (?id) { id == teamId };
                    };
                },
            )
        );

        if (threads.size() > 0) {
            ?threads[0].id;
        } else {
            null;
        };
    };

    public query func getMessageThreadIdForClub(clubId : Nat) : async ?Nat {
        let threads = Iter.toArray(
            Iter.filter(
                natMap.vals(messageThreads),
                func(thread : MessageThread) : Bool {
                    switch (thread.clubId) {
                        case null { false };
                        case (?id) { id == clubId };
                    };
                },
            )
        );

        if (threads.size() > 0) {
            ?threads[0].id;
        } else {
            null;
        };
    };

    public type AnnouncementComment = {
        id : Nat;
        announcementId : Nat;
        user : Principal;
        comment : Text;
        timestamp : Time.Time;
    };

    var announcementComments = natMap.empty<AnnouncementComment>();
    var nextAnnouncementCommentId : Nat = 1;

    public shared ({ caller }) func commentOnAnnouncement(announcementId : Nat, comment : Text) : async AnnouncementComment {
        ensureUser(caller);

        switch (natMap.get(announcements, announcementId)) {
            case null {
                Debug.trap("Announcement not found");
            };
            case (?_announcement) {
                let announcementComment : AnnouncementComment = {
                    id = nextAnnouncementCommentId;
                    announcementId;
                    user = caller;
                    comment;
                    timestamp = Time.now();
                };

                announcementComments := natMap.put(announcementComments, nextAnnouncementCommentId, announcementComment);
                nextAnnouncementCommentId += 1;

                announcementComment;
            };
        };
    };

    public query func getAnnouncementComments(announcementId : Nat) : async [AnnouncementComment] {
        let filtered = Iter.filter(
            natMap.vals(announcementComments),
            func(comment : AnnouncementComment) : Bool {
                comment.announcementId == announcementId;
            },
        );
        Iter.toArray(filtered);
    };

    public type Subfolder = {
        id : Nat;
        name : Text;
        parentType : ParentType;
        creator : Principal;
        createdAt : Time.Time;
    };

    public type ParentType = {
        #club : Nat;
        #team : Nat;
    };

    var subfolders = natMap.empty<Subfolder>();
    var nextSubfolderId : Nat = 1;

    public shared ({ caller }) func createSubfolder(name : Text, parentType : ParentType) : async Subfolder {
        ensureUser(caller);

        let hasPermission = switch (parentType) {
            case (#club(clubId)) { hasClubAdminRole(caller, clubId) };
            case (#team(teamId)) { hasTeamAdminRole(caller, teamId) };
        };

        if (not hasPermission) {
            Debug.trap("Unauthorized: Only club or team admins can create subfolders");
        };

        let subfolder : Subfolder = {
            id = nextSubfolderId;
            name;
            parentType;
            creator = caller;
            createdAt = Time.now();
        };

        subfolders := natMap.put(subfolders, nextSubfolderId, subfolder);
        nextSubfolderId += 1;

        subfolder;
    };

    public query func getAllSubfolders() : async [Subfolder] {
        Iter.toArray(natMap.vals(subfolders));
    };

    public query func getSubfoldersByParent(parentType : ParentType) : async [Subfolder] {
        let filtered = Iter.filter(
            natMap.vals(subfolders),
            func(subfolder : Subfolder) : Bool {
                subfolder.parentType == parentType;
            },
        );
        Iter.toArray(filtered);
    };

    public query func getSubfolderById(id : Nat) : async ?Subfolder {
        natMap.get(subfolders, id);
    };

    public shared ({ caller }) func deleteSubfolder(subfolderId : Nat) : async Bool {
        ensureUser(caller);

        switch (natMap.get(subfolders, subfolderId)) {
            case null {
                Debug.trap("Subfolder not found");
            };
            case (?subfolder) {
                let hasPermission = switch (subfolder.parentType) {
                    case (#club(clubId)) { hasClubAdminRole(caller, clubId) };
                    case (#team(teamId)) { hasTeamAdminRole(caller, teamId) };
                };

                if (not hasPermission) {
                    Debug.trap("Unauthorized: Only club or team admins can delete subfolders");
                };

                subfolders := natMap.delete(subfolders, subfolderId);
                true;
            };
        };
    };
};

