from scipy import stats

def run_anova(group1, group2):
    F, p = stats.f_oneway(group1, group2)
    return p
