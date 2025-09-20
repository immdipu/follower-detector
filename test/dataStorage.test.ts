import { DataStorage } from '../src/dataStorage';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('DataStorage', () => {
  let dataStorage: DataStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPath.resolve.mockImplementation((...args) => args.join('/'));
    dataStorage = new DataStorage();
  });

  describe('addDetectedFollower', () => {
    it('should add a new follower when followsYouBack is true and follower does not exist', () => {
      const result = {
        userId: '123',
        username: 'testuser',
        avatar: 'avatar.jpg',
        followers: 100,
        following: 50,
        friends: 10,
        supporter: 5,
        isVerified: false,
        followsYouBack: true,
        followSuccess: true,
        unfollowSuccess: false,
        timestamp: new Date().toISOString(),
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([]));
      mockedFs.writeFileSync.mockImplementation(() => {});

      dataStorage.addDetectedFollower(result);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        './followers.json',
        expect.stringContaining('"userId": "123"')
      );
    });

    it('should not add follower when followsYouBack is false', () => {
      const result = {
        userId: '123',
        username: 'testuser',
        avatar: 'avatar.jpg',
        followers: 100,
        following: 50,
        friends: 10,
        supporter: 5,
        isVerified: false,
        followsYouBack: false,
        followSuccess: true,
        unfollowSuccess: false,
        timestamp: new Date().toISOString(),
      };

      dataStorage.addDetectedFollower(result);

      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should not add follower if already exists', () => {
      const result = {
        userId: '123',
        username: 'testuser',
        avatar: 'avatar.jpg',
        followers: 100,
        following: 50,
        friends: 10,
        supporter: 5,
        isVerified: false,
        followsYouBack: true,
        followSuccess: true,
        unfollowSuccess: false,
        timestamp: new Date().toISOString(),
      };

      const existingFollowers = [{ userId: '123', username: 'existing' }];
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingFollowers));

      dataStorage.addDetectedFollower(result);

      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });
  });
});