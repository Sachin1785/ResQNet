class Baselines:
    @staticmethod
    def myopic_policy(demands, supplies):
        return min(demands, supplies)
